"""Build the practice library, keeping imported reference content separate."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
base=json.loads((root/'content/a1-topics-20.json').read_text())
blocks=re.split(r'^# \d+ .+\n',(root/'content/practice/additional-sentences.txt').read_text(),flags=re.M)[1:]
prompts=re.split(r'^# \d+\n',(root/'content/practice/dialogue-prompts.txt').read_text(),flags=re.M)[1:]
assert len(blocks)==len(prompts)==20
packs=[]
for lesson,block,questions in zip(base['lessons'],blocks,prompts):
 pairs=[line.split('|') for line in block.strip().splitlines()]
 assert len(pairs)==20
 for i,(en,vi) in enumerate(pairs,11): lesson['sentences'].append(dict(english=en,vietnamese=vi,position=i))
 assert len(set(s['english'] for s in lesson['sentences']))==30
 lesson['accent']='en-GB'
 lesson['sentences']=[dict(s,pronunciation_focus='Nghe và nhắc lại; chú ý trọng âm và không bỏ âm cuối.',
  speaking_task=f"Dùng câu này trong tình huống {lesson['title_vi'].lower()}; thay thông tin khi phù hợp.",
  sample_response=s['english'],review_prompt='Nhìn gợi ý tiếng Việt và tự nói tiếng Anh, sau đó mở đáp án để đối chiếu.') for s in lesson['sentences']]
 qa=[line.split('|') for line in questions.strip().splitlines()];assert len(qa)==6
 dialogues=[]
 for i in range(3):
  turns=[]
  for q,vi,index in qa[i*2:i*2+2]:
   answer=lesson['sentences'][int(index)-1]
   turns.extend([['A',q,vi],['B',answer['english'],answer['vietnamese']]])
  dialogues.append(dict(id=i+1,title=f"{lesson['title_vi']} · Hội thoại {i+1}",turns=turns,
   challenge='Luyện cả hai vai, rồi thay một thông tin để tạo hội thoại của bạn.'))
 lesson['conversations']=dialogues
 lesson['free_prompts']=[dict(english=q,vietnamese=vi) for q,vi,_ in qa[::2]]
 packs.append(lesson)
intro=json.loads((root/'content/practice/intro-reference.json').read_text())
# The reference repeats two sentences. Keep 30 unique study prompts, without
# altering the original reference file or any IDs in Supabase.
intro['sentences'][22].update(text='I work with friendly people.',translation_vi='Tôi làm việc với những người thân thiện.',ipa='',pronunciation_focus='Giữ rõ âm cuối trong work và friendly.')
intro['sentences'][29].update(text='See you next time!',translation_vi='Hẹn gặp bạn lần sau!',ipa='',pronunciation_focus='Giữ rõ âm cuối trong next và time.')
introPack=dict(key='intro-reference-v2',number=1,title='Lesson 1: Introducing Yourself',title_vi='Giới thiệu bản thân',accent='en-GB',
 sentences=[dict(position=s['order'],english=s['text'],vietnamese=s['translation_vi'],ipa=s.get('ipa',''),ipa_source='reference',
  pronunciation_focus=s['pronunciation_focus'],speaking_task=s['speaking_task'],sample_response=s['text'] if 'Personalise' in s['sample_response'] else s['sample_response'],review_prompt=s['review_prompt']) for s in intro['sentences']],
 conversations=intro['conversations'],free_prompts=[dict(english=x,vietnamese=y) for x,y in [
 ('What is your name?','Bạn tên gì?'),('Where are you from?','Bạn đến từ đâu?'),('What do you do?','Bạn làm nghề gì?'),('Why are you learning English?','Vì sao bạn học tiếng Anh?')]])
assert len(set(s['english'] for s in introPack['sentences']))==30
packs.insert(0,introPack)
cachePath=root/'content/practice/ipa-cache.json'
cache=json.loads(cachePath.read_text()) if cachePath.exists() else {}
missing=[]
for pack in packs:
 for sentence in pack['sentences']:
  if not sentence.get('ipa'):
   if sentence['english'] in cache:
    sentence['ipa']=cache[sentence['english']];sentence['ipa_source']='espeak-ng-en-gb-auto'
   else: missing.append(sentence['english'])
(root/'content/practice/ipa-needed.json').write_text(json.dumps(sorted(set(missing)),ensure_ascii=False)+'\n')
if missing: print('IPA generation needed:',len(set(missing)))
else:
 (root/'src/data/practicePacks.json').write_text(json.dumps(dict(version=2,lessons=packs),ensure_ascii=False,separators=(',',':'))+'\n')
 (root/'content/practice/topics-expanded.json').write_text(json.dumps(dict(pack_id='mikey-a1-practice-v2',lessons=packs[1:]),ensure_ascii=False,indent=2)+'\n')
 print('Built 21 practice packs: 630 unique-per-lesson sentences and 63 dialogues.')
