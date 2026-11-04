import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completeChat,prepareChat} from '../src/chat.mjs';

const value=(content,previous)=>({professorId:'ai-001',academicContext:{grade:'2',unitId:'computing',programId:'ai'},
  messages:[...(previous?[{role:'user',content:previous},{role:'assistant',content:'현재 학교 자료가 연결되어 있지 않습니다.'}]:[]),{role:'user',content}]});

for(const content of ['인공지능과 머신러닝의 차이를 설명해줘','기말고사 대비 선형대수 문제 하나 내줘','2학년 수준으로 딥러닝을 설명해줘']){
  test(`learning stays available after cleanup: ${content}`,async()=>{
    let calls=0;
    const result=await completeChat({apiKey:'test-key',model:'test-model',timeoutMs:1000},prepareChat(value(content)),
      async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:'학습 설명입니다.'}}]}));});
    assert.equal(result.model,'test-model');assert.match(result.reply,/학습/);assert.equal(calls,1);
  });
}
for(const [content,previous] of [['AI전공의 최신 공지 알려줘'],['휴학 가능한 총 기간은?'],['그럼 언제 신청해?','장학금 공지 알려줘']]){
  test(`unsupported academic information stays grounded: ${content}`,async()=>{
    const result=await completeChat({apiKey:'',timeoutMs:1000},prepareChat(value(content,previous)),
      ()=>assert.fail('unsupported facts must not reach the provider'));
    assert.equal(result.model,'knowledge-not-connected');assert.match(result.reply,/확인할 수 없/);
  });
}

const conversation=questions=>({...value(questions.at(-1)),messages:questions.flatMap((content,index)=>[
  {role:'user',content},...(index<questions.length-1?[{role:'assistant',content:'현재 학교 자료가 연결되어 있지 않습니다.'}]:[]),
])});

for(const questions of [
  ['장학금 공지 알려줘','그럼 언제 신청해?','그럼 출처는?'],
  ['장학금 공지 알려줘','그럼 자세히 설명해줘'],
  ['장학금 공지 알려줘','설명해줘'],
  ['장학금 공지 알려줘','그럼 언제 신청해?','그럼 자세히 설명해줘','그럼 근거는?'],
]){
  test(`academic intent persists across dependent turns: ${questions.join(' → ')}`,async()=>{

    let calls=0;
    {
      const result=await completeChat({apiKey:'test-key',model:'test-model',timeoutMs:1000},prepareChat(conversation(questions)),
        async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:'근거 없는 답변입니다.'}}]}));});
      assert.equal(calls,0);
      assert.equal(result.model,'knowledge-not-connected');
      assert.match(result.reply,/확인할 수 없/);
    }
  });
}

for(const questions of [
  ['장학금 공지 알려줘','그럼 딥러닝을 설명해줘'],
  ['장학금 공지 알려줘','선형대수 문제 하나 내줘'],
  ['장학금 공지 알려줘','그럼 언제 신청해?','그럼 딥러닝을 설명해줘','그럼 자세히 설명해줘'],
]){
  test(`a new learning topic clears academic intent: ${questions.join(' → ')}`,async()=>{

    let calls=0;
    {
      const result=await completeChat({apiKey:'test-key',model:'test-model',timeoutMs:1000},prepareChat(conversation(questions)),
        async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:'학습 설명입니다.'}}]}));});
      assert.equal(calls,1);
      assert.equal(result.model,'test-model');
      assert.match(result.reply,/학습/);
    }
  });
}
