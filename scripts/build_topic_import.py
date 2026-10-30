"""Generate a single transactional Supabase import from the reviewed topic pack."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
pack = json.loads((ROOT / 'content/a1-topics-20.json').read_text())
assert len(pack['lessons']) == 20
assert [lesson['number'] for lesson in pack['lessons']] == list(range(3, 23))
for lesson in pack['lessons']:
    assert len(lesson['sentences']) == 10
    assert [s['position'] for s in lesson['sentences']] == list(range(1, 11))
    assert len({s['english'] for s in lesson['sentences']}) == 10
    assert all(s['english'].strip() and s['vietnamese'].strip() for s in lesson['sentences'])

# One lesson per line keeps the data block easy to distinguish from executable SQL.
data = '[\n' + ',\n'.join(json.dumps(lesson, ensure_ascii=False) for lesson in pack['lessons']) + '\n]'
assert '$topic_data$' not in data
sql = '''-- EnglishwithMikey: 20 new A1 topic lessons, 10 sentences each.
-- Run this whole file ONCE in the Supabase SQL Editor for your project.
-- Target: course 1, EnglishwithMikey Basic Communication A1.
-- Adds Lesson 3 through Lesson 22 as Draft; leaves all existing lessons unchanged.
-- Entire import is atomic. Re-running skips previously imported lessons.
BEGIN;
DO $import$
DECLARE
  pack_id constant text := 'mikey-a1-topics-v1';
  lesson_record jsonb;
  sentence_record jsonb;
  imported_lesson_id bigint;
  previous_description text;
  previous_count integer;
  added integer := 0;
  skipped integer := 0;
  sentence_columns text := '';
  sentence_values text := '';
  optional_column text;
  lesson_data jsonb := $topic_data$
''' + data + '''
$topic_data$::jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(pack_id));
  IF NOT EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = 1 AND title LIKE 'EnglishwithMikey%Basic Communication A1'
  ) THEN
    RAISE EXCEPTION 'Course 1 does not match Basic Communication A1. No changes made.';
  END IF;

  -- Check required lesson fields without altering the schema.
  FOREACH optional_column IN ARRAY ARRAY['content', 'objectives', 'status', 'order_index'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = optional_column
    ) THEN
      RAISE EXCEPTION 'Missing lessons.% column. No changes made.', optional_column;
    END IF;
  END LOOP;

  -- Match either ordering convention and any available explanatory fields.
  FOREACH optional_column IN ARRAY ARRAY['sentence_order', 'order_index'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sentences' AND column_name = optional_column
    ) THEN
      sentence_columns := sentence_columns || ', ' || quote_ident(optional_column);
      sentence_values := sentence_values || ', $4';
    END IF;
  END LOOP;
  IF sentence_columns = '' THEN
    RAISE EXCEPTION 'No supported sentence ordering column. No changes made.';
  END IF;
  FOREACH optional_column IN ARRAY ARRAY['vocabulary_notes', 'grammar_explanation', 'context_of_use'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sentences' AND column_name = optional_column
    ) THEN
      sentence_columns := sentence_columns || ', ' || quote_ident(optional_column);
      sentence_values := sentence_values || CASE optional_column
        WHEN 'vocabulary_notes' THEN ', $5'
        WHEN 'grammar_explanation' THEN ', $6'
        ELSE ', $7' END;
    END IF;
  END LOOP;

  FOR lesson_record IN SELECT value FROM jsonb_array_elements(lesson_data) LOOP
    SELECT count(*) INTO previous_count FROM public.lessons
    WHERE course_id = 1 AND title = lesson_record->>'title';
    IF previous_count > 1 THEN
      RAISE EXCEPTION 'Duplicate lesson title: %. No changes made.', lesson_record->>'title';
    END IF;
    IF previous_count = 1 THEN
      SELECT description INTO previous_description FROM public.lessons
      WHERE course_id = 1 AND title = lesson_record->>'title';
      IF strpos(coalesce(previous_description, ''), pack_id) = 0 THEN
        RAISE EXCEPTION 'Existing unrelated lesson has title %. No changes made.', lesson_record->>'title';
      END IF;
      -- Never overwrite edits, publish status or saved student progress on rerun.
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.lessons (course_id, title, description, content, objectives, order_index, status)
    VALUES (
      1, lesson_record->>'title',
      (lesson_record->>'description') || E'\\n\\n/*--EWM_META:' ||
        jsonb_build_object('pack_id', pack_id, 'lesson_key', lesson_record->>'key')::text || ':EWM_META--*/',
      lesson_record->>'content', lesson_record->>'objectives',
      (lesson_record->>'number')::integer, 'Draft'
    ) RETURNING id INTO imported_lesson_id;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'lesson_order'
    ) THEN
      EXECUTE 'UPDATE public.lessons SET lesson_order = $1 WHERE id = $2'
      USING (lesson_record->>'number')::integer, imported_lesson_id;
    END IF;

    FOR sentence_record IN SELECT value FROM jsonb_array_elements(lesson_record->'sentences') LOOP
      EXECUTE 'INSERT INTO public.sentences (lesson_id, english, vietnamese' || sentence_columns ||
        ') VALUES ($1, $2, $3' || sentence_values || ')'
      USING imported_lesson_id, sentence_record->>'english', sentence_record->>'vietnamese',
        (sentence_record->>'position')::integer, lesson_record->>'vocabulary_notes',
        lesson_record->>'grammar', lesson_record->>'title_vi';
    END LOOP;
    added := added + 1;
  END LOOP;
  RAISE NOTICE 'Added % lessons (% sentences); skipped % previously imported lessons.', added, added * 10, skipped;
END;
$import$;
COMMIT;

-- Verify imported lessons and counts. Draft is a content status, not an RLS change.
SELECT l.id, l.title, l.order_index, l.status, count(s.id) AS sentence_count
FROM public.lessons l
LEFT JOIN public.sentences s ON s.lesson_id = l.id
WHERE l.course_id = 1 AND strpos(coalesce(l.description, ''), 'mikey-a1-topics-v1') > 0
GROUP BY l.id, l.title, l.order_index, l.status
ORDER BY l.order_index;
'''
(ROOT / 'content/import-a1-topics-20.sql').write_text(sql)
print('Generated 20-lesson transactional import; 200 sentences.')
