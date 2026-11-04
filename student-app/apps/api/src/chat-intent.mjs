// Distinguishes general learning from school facts that require disconnected official sources.
const academicTerms = /금오|학사|학년|학기|학점|교육과정|커리큘럼|교과목|전공.{0,8}(?:공지|과목|수업|졸업)|수강|재수강|졸업|휴학|복학|학적|등록금|장학|공결|공지(?!능)|개강|종강|중간고사|기말고사|중간시험|기말시험|학교.{0,8}(?:행사|이벤트|축제|수업|시험|성적)|대학.{0,8}(?:성적|입학|등록)|증명서/;
const genericExplanation = /^(?:(?:그럼|그러면|그거|그것|그건|그걸|이거|이것|그내용|그부분)(?:을|를|도|에대해)?)*(?:(?:좀|조금|더|자세히|상세히|쉽게|다시))*설명(?:해줘|해주세요|해줄래|해봐|해|부탁해)[.!?？]*$/;

function classifyTurn(query, previous) {
  const text = String(query).normalize('NFKC');
  const previousAcademic = academicTerms.test(previous);
  const dependentExplanation = genericExplanation.test(text.replace(/\s+/g, ''));
  const learning = /문제.{0,12}(?:내줘|만들|풀|풀이)|(?:설명|증명|계산|유도|예제|코드).{0,6}(?:해|줘|보여)|개념/.test(text) &&
    !/금오|학사|학점|교육과정|졸업|수강신청|휴학|복학|등록금|장학|공지(?!능)|(?:시험|고사).{0,12}(?:언제|날짜|기간|일정)|규정|요건/.test(text) &&
    !(previousAcademic && dependentExplanation);
  const academic = !learning && academicTerms.test(text);
  const followup = !learning && !academic && previousAcademic &&
    (dependentExplanation || /(?:그럼|그러면|그거|그것|그건|그중|거기|이번|올해|내년|작년|언제|기간|신청|자세히|몇|출처|근거)/.test(text));
  return {academic: academic || followup, query: followup ? previous.slice(0, 500) + '\n' + text : text};
}

export function analyzeChatIntent(messages) {
  let intent = {academic: false, query: ''};
  for (const message of messages.filter(row => row.role === 'user')) {
    intent = classifyTurn(message.content, intent.academic ? intent.query : '');
  }
  return intent;
}
