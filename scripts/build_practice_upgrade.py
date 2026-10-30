from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
base=(root/'content/import-a1-topics-20.sql').read_text()
# Reuse the tested base import inside ONE transaction for both new installations
# and upgrades. Drop only its outer transaction and final diagnostic SELECT.
body=base[base.index('DO $import$'):base.index('\nCOMMIT;')]
pack=json.loads((root/'src/data/practicePacks.json').read_text())
lessons=[]
for l in pack['lessons'][1:]:
 lessons.append(dict(title=l['title'],sentences=[{k:s[k] for k in ['english','vietnamese','position','ipa']} for s in l['sentences']],grammar=l['grammar'],vocabulary_notes=l['vocabulary_notes'],title_vi=l['title_vi']))
data='[\n'+',\n'.join(json.dumps(l,ensure_ascii=False) for l in lessons)+'\n]'
assert '$upgrade_data$' not in data
sql='''-- EnglishwithMikey practice v2: 20 topics x 30 sentences.
-- Run the ENTIRE file in Supabase SQL Editor. No schema or RLS changes.
-- Preserves existing sentence IDs, completed learning_progress, XP and publish status.
-- Creates the 20 topic lessons as Draft if the original import has not been run.
-- Lesson 1 and Lesson 2 are never replaced or expanded by this script.
BEGIN;
'''+body+'''
DO $upgrade$
DECLARE
  lesson_data jsonb := $upgrade_data$
'''+data+'''
$upgrade_data$::jsonb;
  topic jsonb;
  sentence jsonb;
  target_id bigint;
  candidate_count integer;
  sentence_count integer;
  column_name_to_add text;
  extra_columns text := '';
  extra_values text := '';
  added integer := 0;
  affected integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mikey-a1-topics-v1'));
  FOREACH column_name_to_add IN ARRAY ARRAY['sentence_order', 'order_index', 'ipa', 'vocabulary_notes', 'grammar_explanation', 'context_of_use'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='sentences' AND column_name=column_name_to_add
    ) THEN
      extra_columns := extra_columns || ', ' || quote_ident(column_name_to_add);
      extra_values := extra_values || CASE column_name_to_add
        WHEN 'sentence_order' THEN ', $4'
        WHEN 'order_index' THEN ', $4'
        WHEN 'ipa' THEN ', $5'
        WHEN 'vocabulary_notes' THEN ', $6'
        WHEN 'grammar_explanation' THEN ', $7'
        ELSE ', $8' END;
    END IF;
  END LOOP;
  FOR topic IN SELECT value FROM jsonb_array_elements(lesson_data) LOOP
    SELECT count(*), min(id) INTO candidate_count, target_id
    FROM public.lessons WHERE course_id=1 AND title=topic->>'title'
      AND strpos(coalesce(description,''),'mikey-a1-topics-v1')>0;
    IF candidate_count <> 1 THEN
      RAISE EXCEPTION 'Cannot identify exact imported topic %. Nothing changed.', topic->>'title';
    END IF;
    IF EXISTS (SELECT 1 FROM public.sentences WHERE lesson_id=target_id GROUP BY english HAVING count(*)>1) THEN
      RAISE EXCEPTION 'Duplicate sentences already exist in %. Nothing changed.', topic->>'title';
    END IF;
    -- Refuse to silently reintroduce or overwrite teacher-edited sentences.
    IF EXISTS (
      SELECT 1 FROM public.sentences existing WHERE existing.lesson_id=target_id
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(topic->'sentences') expected WHERE expected->>'english'=existing.english)
    ) THEN
      RAISE EXCEPTION 'Teacher-edited content in %. Review a mapping before importing. Nothing changed.', topic->>'title';
    END IF;
    FOR sentence IN SELECT value FROM jsonb_array_elements(topic->'sentences') LOOP
      EXECUTE 'INSERT INTO public.sentences (lesson_id, english, vietnamese' || extra_columns ||
        ') SELECT $1, $2, $3' || extra_values ||
        ' WHERE NOT EXISTS (SELECT 1 FROM public.sentences WHERE lesson_id=$1 AND english=$2)'
      USING target_id, sentence->>'english', sentence->>'vietnamese',
        (sentence->>'position')::integer, sentence->>'ipa', topic->>'vocabulary_notes',
        topic->>'grammar', topic->>'title_vi';
      GET DIAGNOSTICS affected = ROW_COUNT;
      added := added + affected;
    END LOOP;
    SELECT count(*) INTO sentence_count FROM public.sentences WHERE lesson_id=target_id;
    IF sentence_count <> 30 THEN
      RAISE EXCEPTION 'Unexpected count in %: %. Nothing changed.', topic->>'title', sentence_count;
    END IF;
  END LOOP;
  RAISE NOTICE 'Added % sentences. Existing IDs and learning progress were preserved.', added;
END;
$upgrade$;
COMMIT;
SELECT l.id, l.title, l.status, count(s.id) AS sentence_count
FROM public.lessons l LEFT JOIN public.sentences s ON s.lesson_id=l.id
WHERE l.course_id=1 AND strpos(coalesce(l.description,''),'mikey-a1-topics-v1')>0
GROUP BY l.id,l.title,l.status,l.order_index ORDER BY l.order_index;
'''
(root/'content/upgrade-a1-practice-v2.sql').write_text(sql)
print('Generated upgrade: 20 topics, 600 sentences total; existing rows never updated.')
