(() => {
  const H=window.Cabin;if(!H)return;const $=id=>document.getElementById(id);
  const publicSite=Boolean(window.CabinPublication);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const body=$('drawerBody'),memoryKey='folkhouse-pocket-notes-v1',roomTime=H.roomTime;
  let journal=[];try{const saved=JSON.parse(localStorage.getItem(memoryKey)||'[]');if(Array.isArray(saved))journal=saved.filter(n=>typeof n?.text==='string'&&typeof n?.title==='string').slice(0,80);}catch{}
  const songs=[
    // The bundled recording enters its 84 BPM groove at 7.179 seconds and ends it before the fade.
    {id:'san-yue-san',name:'三月三',info:'简四月',duration:234,drumGrid:{first:7.179,bpm:84,halfBeats:603}},
    {id:'ai-ren',name:'爱人',info:'小屋演唱版本待核实',pending:true}
  ];
  const drinks=[
    {name:'自接梅子酒',place:'丽江',desc:'梅香微酸，倒进小陶杯。',color:0xb77a57},
    {name:'瓶装豆奶',place:'无酒精',desc:'不开酒，也有一瓶豆奶可以慢慢喝。',color:0xe7c694},
    {name:'果汁气泡',place:'无酒精',desc:'青柠和果汁兑气泡水，做成无酒精的一杯。',color:0xc7a354}
  ];
  const audio=new Audio();audio.preload='none';audio.volume=.72;
  let sound=false,ctx=null,air=null,master=null,track=null,orderUntil=0,deliverDrink=null,cup=null,selectedDrink=null,sips=0,nextBeat=0,beatNum=0,tempo=86,beatUntil=0,currentResult=null,frameClock=0;
  let singer=null,bartender=null,drummer=null,suspendTimer;
  let guitarDemo=null,kitPlayback=null,resumeSong=false;
  const cups=new Map();
  const drafts=new Map();
  const audioRate=24000, drumSteps=64, guitarStep=.63;
  const guitarChords=[[48,52,55,60,64],[43,50,55,59,62,67],[45,52,57,60,64],[41,48,53,57,60,65]];
  const guitarStrums=guitarChords.length*2-1;
  const kitPattern=[
    [null,'ride',true],[null,'ride'],['snare','ride'],[null,'ride'],
    [null,'ride',true],[null,'ride'],['snare','ride'],[null,'ride'],
    [null,'ride',true],[null,'ride'],['snare','ride'],[null,'ride'],
    [null,'ride',true],[null,'ride',true],['snare','ride'],[null,'tom']
  ];
  const drumVoices={
    kick:[127,45,.21,.63,.024,.055,.019],
    snare:[216,142,.16,.24,.32,.029,.041],
    ride:[0,0,.088,0,.14,.017,.021],
    tom:[170,81,.21,.46,.043,.056,.029]
  };
  const drumSamples=new Map(),strings=new Map();
  function selectedBot(){return H.drawer()==='bot'?H.byId(H.selected()):null;}
  function refreshSkill(skill){const b=selectedBot();if(b&&(b.skill||b.id)===skill)render('bot',b.id);}
  function refreshMusic(){const b=selectedBot();if(b&&(b.props.guitar||b.props.voice))render('bot',b.id);}
  function draft(id){if(!drafts.has(id))drafts.set(id,{});return drafts.get(id);}
  const sample='00:00 欢迎来到小屋，今晚我们聊聊第一次上台。\n00:14 我练了三个月吉他，到了台上第一下还是弹错了。\n00:31 台下有人帮我唱了第一句，我才想起来要呼吸。\n00:56 后来我才明白，大家记住的是你为什么唱，不是那个错音。\n01:20 中间休息，大家喝口水。\n01:36 如果你也害怕开口，先唱给离你最近的那个人听。';
  function title(over,name){$('drawerOver').textContent=over;$('drawerTitle').textContent=name;}
  async function copyToClipboard(text){
    if(navigator.clipboard?.writeText){
      try{await navigator.clipboard.writeText(text);return true;}catch{}
    }
    const previous=document.activeElement,field=document.createElement('textarea');
    field.readOnly=true;field.value=text;
    field.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none;font-size:16px';
    document.body.append(field);
    try{
      field.focus({preventScroll:true});field.select();field.setSelectionRange(0,text.length);
      return document.execCommand('copy');
    }catch{return false;}
    finally{field.remove();if(previous?.isConnected)previous.focus({preventScroll:true});}
  }
  async function copyText(text){H.toast(await copyToClipboard(text)?'已复制':'请选择手记文字复制');}
  function saveNote(title,text){const key=title+'\n'+text;if(journal.some(n=>n.title+'\n'+n.text===key)){H.toast('这页已经在口袋里');return;}
    journal.unshift({title,text,at:new Date().toLocaleString('zh-CN',{hour:'2-digit',minute:'2-digit'})});journal=journal.slice(0,80);
    try{localStorage.setItem(memoryKey,JSON.stringify(journal));H.toast('已放进口袋手记');}catch{H.toast('已放进口袋，本次打开期间有效');}
  }
  function download(name,text){const u=URL.createObjectURL(new Blob(['\uFEFF',text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function resultBox(){return '<div id="workResult" class="result" aria-live="polite"></div><div id="resultActions" class="choices" hidden><button class="act" data-act="keep">放进口袋手记</button><button class="quiet" data-act="copy">复制</button></div>';}
  function result(title,text){currentResult={title,text};$('workResult').textContent=text;$('resultActions').hidden=false;H.notify(title+' 已完成',true);}
  function tone(time,freq,len=.12,gain=.09,type='sine',end=null){
    if(!sound||!ctx||!master)return;const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);if(end)osc.frequency.exponentialRampToValueAtTime(end,time+len*.8);
    env.gain.setValueAtTime(.0001,time);env.gain.exponentialRampToValueAtTime(gain,time+.008);env.gain.exponentialRampToValueAtTime(.0001,time+len);osc.connect(env);env.connect(master);osc.start(time);osc.stop(time+len+.01);osc.onended=()=>{osc.disconnect();env.disconnect();};
  }
  function unlock(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC||!sound)return;
    if(!ctx){try{ctx=new AC();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);}catch{return;}}
    ctx.resume().catch(()=>{});
  }
  function airSound(){if(!ctx||air)return;const buf=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buf.getChannelData(0);let den=0;
    for(let j=0;j<data.length;j++){den=(den+.035*(Math.random()*2-1))/1.035;data[j]=den*2.5;}
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='lowpass';filter.frequency.value=850;gain.gain.value=.058;src.buffer=buf;src.loop=true;src.connect(filter);filter.connect(gain);gain.connect(master);src.start();air=src;
  }
  function setSound(next){
    sound=next;clearTimeout(suspendTimer);
    if(sound){unlock();airSound();}
    if(!sound&&guitarDemo){stopGuitar();refreshMusic();}
    if(!sound&&kitPlayback){stopBeat();refreshSkill('beat');}
    if(ctx&&master){
      master.gain.setTargetAtTime(sound?.58:0,ctx.currentTime,.06);
      // Let the fade finish before putting the looping ambience to sleep.
      if(!sound)suspendTimer=setTimeout(()=>{if(!sound)ctx.suspend().catch(()=>{});},280);
    }
    audio.muted=!sound;$('soundText').textContent=sound?'声音开':'声音关';$('sound').classList.toggle('muted',!sound);$('sound').setAttribute('aria-label',sound?'关闭声音':'打开声音');$('sound').setAttribute('aria-pressed',String(sound));}
  $('sound').classList.add('muted');$('sound').onclick=()=>setSound(!sound);
  function songTime(seconds){return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
  function syncMusic(){
    $('nowPlaying').hidden=!track;if(!track)return;$('songTitle').textContent=track.info+' · '+track.name;
    const paused=audio.paused;$('pauseSong').textContent=paused?'▶':'Ⅱ';$('pauseSong').setAttribute('aria-label',paused?'继续演唱':'暂停演唱');
    const seconds=Math.floor(audio.currentTime);
    $('lyric').textContent=paused?'已暂停':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' / '+songTime(track.duration);
  }
  async function playSong(id,performer){
    const s=songs.find(s=>s.id===id);if(!s||s.pending||!performer?.props.voice)return;stopBeat();stopGuitar();setSound(true);
    if(track!==s||singer!==performer){track=s;singer=performer;audio.src=window.CabinMedia?.[s.id]||'audio/'+s.id+'.mp3';}
    try{await audio.play();if(track===s&&singer===performer&&!audio.paused){H.notify('正在播放 '+s.info+'《'+s.name+'》',true);syncMusic();}}
    catch(error){if(error.name!=='AbortError')H.toast('音频未能播放，请重新点歌或打开完整 HTML');}
    refreshMusic();
  }
  function pauseSong(){if(!track)return;if(audio.paused)playSong(track.id,singer);else{audio.pause();syncMusic();refreshMusic();}}
  $('pauseSong').onclick=pauseSong;audio.onended=()=>{if(!track)return;H.notify(singer.name+' 唱完了《'+track.name+'》',true);track=null;singer=null;syncMusic();refreshMusic();};audio.ontimeupdate=syncMusic;
  function setPaused(paused){
    if(paused){
      resumeSong=!audio.paused;
      if(resumeSong)audio.pause();
      if(sound&&ctx)ctx.suspend().catch(()=>{});
      return;
    }
    if(sound&&ctx)ctx.resume().catch(()=>{});
    if(resumeSong){
      resumeSong=false;
      audio.play().then(syncMusic,()=>{syncMusic();refreshMusic();});
    }
  }

  // Each phrase uses one buffer. Its transport also supplies the on-stage contact times.
  function playStageAudio(buffer,onEnd){
    const source=ctx.createBufferSource(),gain=ctx.createGain(),start=ctx.currentTime+.12;
    source.buffer=buffer;source.connect(gain);gain.connect(master);
    source.onended=()=>{source.disconnect();gain.disconnect();onEnd();};
    source.start(start);
    return {source,gain,start};
  }
  function fadeStageAudio({source,gain}){
    const now=ctx.currentTime;
    gain.gain.setTargetAtTime(0,now,.009);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.stop(now+.035);
  }
  function mixSample(output,sample,seconds,volume=1){
    const offset=Math.round(seconds*audioRate),end=Math.min(sample.length,output.length-offset);
    for(let i=0;i<end;i++)output[offset+i]+=sample[i]*volume;
  }
  function drumSample(note){
    if(drumSamples.has(note))return drumSamples.get(note);
    const [high,low,duration,body,noise,decay,noiseDecay]=drumVoices[note];
    const sample=new Float32Array(Math.round(duration*audioRate));
    let radians=0,previousNoise=0;
    for(let i=0;i<sample.length;i++){
      const t=i/audioRate,white=Math.random()*2-1;
      radians+=Math.PI*2*(low+(high-low)*Math.exp(-t/.025))/audioRate;
      const ring=body*Math.sin(radians)*Math.exp(-t/decay);
      const transient=noise*(white-.76*previousNoise)*Math.exp(-t/noiseDecay);
      const fade=Math.min(1,i/30,(sample.length-i)/170);
      sample[i]=(ring+transient)*fade;
      previousNoise=white;
    }
    drumSamples.set(note,sample);return sample;
  }
  function kitPhrase(step){
    const buffer=ctx.createBuffer(1,Math.ceil((drumSteps*step+.08)*audioRate),audioRate),output=buffer.getChannelData(0);
    for(let i=0;i<drumSteps;i++){
      const [left,right,kick]=kitPattern[i%kitPattern.length];
      const t=i*step;
      if(left)mixSample(output,drumSample(left),t);
      mixSample(output,drumSample(right),t,i%2?.62:1);
      if(kick)mixSample(output,drumSample('kick'),t);
    }
    return buffer;
  }
  function stringSample(note){
    if(strings.has(note))return strings.get(note);
    const hz=440*Math.pow(2,(note-69)/12),delay=audioRate/hz-.5;
    const period=Math.floor(delay),fraction=delay-period;
    const sample=new Float32Array(Math.round(audioRate*1.30));
    for(let i=0;i<=period+1;i++)sample[i]=.76*(Math.random()*2-1)+.24*(sample[i-1]||0);
    for(let i=period+2;i<sample.length;i++){
      const j=i-period;
      const a=(sample[j-1]+sample[j])*.5,b=(sample[j-2]+sample[j-1])*.5;
      sample[i]=.996*((1-fraction)*a+fraction*b);
    }
    for(let i=0;i<sample.length;i++){
      sample[i]*=Math.exp(-3.7*i/audioRate)*Math.min(1,i/56,(sample.length-i)/440);
    }
    strings.set(note,sample);return sample;
  }
  function guitarPhrase(){
    const duration=guitarChords.length*2*guitarStep+.62;
    const buffer=ctx.createBuffer(1,Math.ceil(duration*audioRate),audioRate),output=buffer.getChannelData(0);
    for(const [i,chord] of guitarChords.entries()){
      for(let j=0;j<chord.length;j++){
        mixSample(output,stringSample(chord[j]),(i*2)*guitarStep+j*.016,.23);
        if(i<guitarChords.length-1)mixSample(output,stringSample(chord[j]),(i*2+1)*guitarStep+(chord.length-1-j)*.014,.145);
      }
    }
    return buffer;
  }
  function stopGuitar(){if(guitarDemo){fadeStageAudio(guitarDemo);guitarDemo=null;}}
  function playGuitar(){
    const performer=selectedBot();if(!performer?.props.guitar)return;
    const wasPlaying=guitarDemo?.performer===performer;
    stopGuitar();
    if(wasPlaying){refreshMusic();return;}
    stopBeat();audio.pause();syncMusic();
    setSound(true);if(!ctx){H.toast('这个浏览器未开放音频');return;}
    guitarDemo={...playStageAudio(guitarPhrase(),()=>{guitarDemo=null;refreshMusic();}),performer};
    H.notify(performer.name+' 弹起了一段吉他',true);refreshMusic();
  }
  const singing=id=>(!id||singer?.id===id)&&!!track&&!audio.paused;
  function songGuitarist(){
    if(!singing()||audio.seeking||audio.readyState<2)return null;
    return singer.props.guitar?singer:H.byId('singer');
  }
  function playingGuitar(id){
    const performer=guitarDemo?.performer||songGuitarist();
    return !!performer&&(!id||id===performer.id);
  }
  function vocalCue(id){
    if(!singing(id))return null;
    const t=audio.currentTime,phrase=.5+.5*Math.sin(t*2.6);
    const syllable=.5+.5*Math.sin(t*14.8+.6*Math.sin(t*3.2));
    return .12+syllable*(.36+.45*phrase);
  }
  const guitarGripPositions=[.38,.78,.16,.58],handCue={sweep:0,grip:0};
  function guitarCue(id){
    if(!playingGuitar(id))return null;
    let time,step,gripTime,strokesPerGrip,strength=1;
    if(guitarDemo){
      step=guitarStep;strokesPerGrip=2;
      const lastAttack=(guitarStrums-1)*step;
      time=ctx.currentTime-guitarDemo.start;
      gripTime=THREE.MathUtils.clamp(time,0,lastAttack);
      // The synthesized strings sound in sequence across ~70 ms. Cross the
      // middle strings 35 ms after the first one, then let the final chord ring.
      time=THREE.MathUtils.clamp(time-.035,-step*.5,lastAttack+step*.5);
    }else{
      const grid=track.drumGrid;
      if(!grid)return null;
      step=30/grid.bpm;strokesPerGrip=8;
      time=audio.currentTime-grid.first;gripTime=time;
      const grooveEnd=grid.halfBeats*step;
      const quietEnd=(audio.duration||track.duration)-grid.first;
      strength=(.48+.52*THREE.MathUtils.smoothstep(time,-.45,.10))*
        (1-THREE.MathUtils.smoothstep(time,grooveEnd,quietEnd));
    }
    // The pick travels fastest through the strings and slows as the wrist
    // turns at either end. Both hands follow the transport, including seeks.
    const wave=Math.sin(Math.PI*time/step);
    handCue.sweep=wave*(1.3-.3*wave*wave)*strength;
    const measure=step*strokesPerGrip,group=Math.floor(gripTime/measure);
    const index=((group%guitarGripPositions.length)+guitarGripPositions.length)%guitarGripPositions.length;
    const shift=THREE.MathUtils.smoothstep(gripTime-group*measure,measure-.19,measure-.025);
    handCue.grip=THREE.MathUtils.lerp(guitarGripPositions[index],guitarGripPositions[(index+1)%guitarGripPositions.length],shift);
    return handCue;
  }
  function guitarStroke(id){return guitarCue(id)?.sweep??null;}
  function gridCue(time,step,count,stride=1){
    const index=Math.round(time/step);
    if(index<0||index>=count)return null;
    return {notes:kitPattern[(index*stride)%kitPattern.length],offset:time-index*step,reach:Math.min(.135,step*.5)};
  }
  function musicKitCue(){
    if(guitarDemo)return gridCue(ctx.currentTime-guitarDemo.start,guitarStep,guitarStrums,2);
    if(!singing()||audio.seeking||audio.readyState<2||!track.drumGrid)return null;
    const {first,bpm,halfBeats}=track.drumGrid;
    return gridCue(audio.currentTime-first,30/bpm,halfBeats);
  }
  function kitCue(id){
    if(kitPlayback){
      return drummer?.id===id?gridCue(ctx.currentTime-kitPlayback.start,kitPlayback.step,drumSteps):null;
    }
    return id==='beat'?musicKitCue():null;
  }
  function followingMusic(id){
    return (!id||id==='beat')&&!kitPlayback&&!nextBeat&&!!musicKitCue();
  }
  function isBeating(id){
    return ((!id||drummer?.id===id)&&(!!kitPlayback||!!nextBeat||roomTime()<beatUntil))||followingMusic(id);
  }
  function stopBeat(){
    if(kitPlayback){fadeStageAudio(kitPlayback);kitPlayback=null;}
    nextBeat=0;beatNum=0;beatUntil=0;drummer=null;
  }
  function beatLabel(){return beatNum?'第 '+(Math.floor((beatNum-1)/4)+1)+' 小节 · '+((beatNum-1)%4+1)+' 拍':'';}
  function showBeat(){if(selectedBot()===drummer&&$('beatCount'))$('beatCount').textContent=beatLabel();}
  function hitBeat(){
    const accent=beatNum%4===0,t=ctx.currentTime;
    tone(t,accent?155:214,.18,accent?.39:.23,'sine',accent?58:84);
    tone(t,accent?340:470,.055,.055,'triangle',220);
    beatNum++;beatUntil=roomTime()+350;showBeat();
    if(beatNum>=32){stopBeat();refreshSkill('beat');}
    else nextBeat=roomTime()+60000/tempo;
  }
  function playBeat(){const performer=selectedBot();if(!performer)return;
    const wasPlaying=drummer===performer&&(!!nextBeat||!!kitPlayback);stopBeat();
    if(wasPlaying){refreshSkill('beat');return;}
    stopGuitar();if(track){audio.pause();syncMusic();}setSound(true);if(!ctx){H.toast('这个浏览器未开放音频');return;}
    drummer=performer;
    if(performer.props.kit){
      const step=30/tempo;
      kitPlayback={...playStageAudio(kitPhrase(step),()=>{kitPlayback=null;drummer=null;beatNum=0;refreshSkill('beat');}),step};
      H.notify(performer.name+' 打起了架子鼓',true);refreshSkill('beat');return;
    }
    hitBeat();refreshSkill('beat');
  }
  function makeCup(idx){
    if(cup)cup.removeFromParent();
    if(!cups.has(idx)){
      const K=HouseKit,vessel=K.mat(idx===1?0xe2d5b2:idx===2?0x81a49d:0xc79b6c);
      cup=new THREE.Group();cup.scale.setScalar(1.42);
      K.cylinder(cup,0,.01,0,.043,.035,.115,vessel,24);
      if(idx===1){K.cylinder(cup,0,.077,0,.021,.043,.034,vessel,20);K.cylinder(cup,0,.105,0,.019,.019,.026,vessel,20);}
      else{const rim=new THREE.Mesh(new THREE.TorusGeometry(.042,.002,6,28),K.mat(0xdec8a1));rim.rotation.x=Math.PI/2;rim.position.y=.068;cup.add(rim);K.cylinder(cup,0,.070,0,.039,.036,.004,K.mat(drinks[idx].color),24);}
      cup.traverse(o=>{o.castShadow=false;});cups.set(idx,cup);
    }
    cup=cups.get(idx);H.player.cup.add(cup);H.player.sipMix=0;sipTime=0;
  }
  const sipBtn=document.createElement('button');sipBtn.id='drinkInHand';sipBtn.className='glass';sipBtn.hidden=true;$('playUI').append(sipBtn);
  let sipTime=0;
  sipBtn.onclick=()=>{if(!selectedDrink)return;sips--;sipTime=roomTime()+740;H.toast(sips?'喝了一口'+selectedDrink.name:'喝完了，杯子已收好');if(!sips){sipBtn.hidden=true;selectedDrink=null;}};
  function orderDrink(idx){if(deliverDrink){H.toast(bartender.name+'正在调制这杯');return;}
    const d=drinks[idx],worker=selectedBot();if(!worker||!d)return;bartender=worker;
    orderUntil=roomTime()+1600;
    let waiting=false;
    deliverDrink=()=>{
      if(!H.takeCup(H.player)){
        if(!waiting){H.toast('留一点空位，酒保就能把杯子递给你');waiting=true;}
        orderUntil=roomTime()+300;return;
      }
      deliverDrink=null;orderUntil=0;selectedDrink=d;sips=3;makeCup(idx);sipBtn.textContent=d.name+' · 喝一口';sipBtn.hidden=false;
      if(sound&&ctx){tone(ctx.currentTime,890,.23,.09);tone(ctx.currentTime+.027,1220,.29,.045);}
      H.notify(worker.name+'把'+d.name+'递给了你',true);H.toast(d.name+' 到了');refreshSkill('bar');
    };
    H.notify(worker.name+'正在准备'+d.name,true);H.toast(worker.name+'接单 · '+d.name);refreshSkill('bar');
  }
  const seatRows=new Map(),individualSeats=[];
  for(const seat of H.room.seats){
    if(!seat.rowName){individualSeats.push(seat);continue;}
    if(!seatRows.has(seat.rowName))seatRows.set(seat.rowName,[]);
    seatRows.get(seat.rowName).push(seat);
  }
  for(const seats of seatRows.values())seats.sort((a,b)=>a.placeNumber-b.placeNumber);
  if(individualSeats.length)seatRows.set('其他听歌席',individualSeats);
  function seatGrid(){
    return Array.from(seatRows,([name,seats])=>{
      const buttons=seats.map(seat=>{
        const label=seat.rowName?seat.placeNumber+' 席':seat.label;
        return '<button class="station" data-seat="'+seat.id+'"><b>'+esc(label)+'</b><small></small></button>';
      }).join('');
      return '<fieldset class="seat-row"><legend>'+esc(name)+'</legend><div class="stations">'+buttons+'</div></fieldset>';
    }).join('');
  }
  function updateSeatGrid(grid){
    for(const button of grid.querySelectorAll('[data-seat]')){
      const seat=H.room.seats[button.dataset.seat],who=seat.occupied||seat.reserved;
      const bot=who&&H.byId(who);
      const guestStatus=seat.occupied?'已入座':bot?.returnSeat===seat&&!bot.targetSeat?'暂时离座':'正走过去';
      const status=who==='you'?(seat.occupied?'你在这里 · 起身':'你正走过去'):
        who?(bot?.name||'来客')+guestStatus:'空座';
      if(button.lastElementChild.textContent!==status){
        button.lastElementChild.textContent=status;
        button.setAttribute('aria-label',seat.label+'，'+status);
        button.disabled=!!who&&seat.occupied!=='you';
      }
    }
  }
  // Match verified public descriptions by template URL, independently of the local display name.
  const templateBios=new Map([
    ['https://x.ai/bot/zkVS-PkX1ooTE2nP21DPO',{
      title:'Pitch Deck Coach',
      summary:'从投资人的角度审阅融资路演稿，指出哪些内容容易被看懂、相信、质疑或记住，再帮你改进故事线、论据和幻灯片。'
    }]
  ]);
  function readyRole(bot){
    const id=bot.skill||bot.id,name=esc(bot.name),fields=draft(bot.id);
    if(id==='grok'){
      const original=bot.sourceId?CabinGrokTransfer.promptLink('请继续你的工作。先告诉我可以提供什么材料。',bot.sourceId):'';
      const notes=bot.instructions?'<details class="exchange-alternate"><summary>查看带来的工作指令</summary><p class="grok-imported-instructions">'+esc(bot.instructions)+'</p></details>':'';
      const template=templateBios.get(bot.templateUrl);
      const intro=template
        ?'<span class="bot-template-name"><small>原模板</small><strong>'+esc(template.title)+'</strong></span>'+esc(template.summary)
        :bot.templateUrl?'从 Grok 分享链接入屋，可在模板页查看这位伙伴的介绍。'
        :bot.instructions?'这位伙伴带来了自己的工作指令，可以展开查看。'
        :'在原 Grok Bot 里与这位伙伴对话。';
      return '<p>'+intro+'</p>'+
        (original?'<a class="act" href="'+esc(original)+'">打开原 Grok Bot ↗</a>':'')+notes;
    }
    if(id==='external'){
      let url;
      try{url=new URL(bot.url);if(url.protocol!=='https:'||url.username||url.password)return '<p>这个 Bot 的服务地址无效。</p>';}
      catch{return '<p>这个 Bot 的服务地址无效。</p>';}
      return '<p>前往 '+esc(url.host)+' 使用'+name+'。</p><a class="act" data-external-bot href="'+esc(url.href)+'" target="_blank" rel="noopener noreferrer">打开 Bot ↗</a>';
    }
    if(bot.props.guitar||bot.props.voice){
      const {guitar,voice}=bot.props;
      const guitarAction=guitarDemo?.performer===bot?'停下吉他':'弹一段吉他';
      const intro=guitar&&voice?'听一段吉他，或点一首小屋歌手的录音。':voice?'点一首歌，听小屋歌手的录音。':'听'+name+'弹一段木吉他。';
      const trial=guitar?'<button class="act" data-act="guitar">'+guitarAction+'</button>':'';
      const playlist=voice?songs.map((s,i)=>{
        const detail=s.duration?s.info+' · '+songTime(s.duration):s.info;
        const action=s.pending?'待接入':singer===bot&&track===s&&!audio.paused?'暂停 Ⅱ':'点唱 ▷';
        return '<button class="choice" data-song="'+s.id+'" '+(s.pending?'disabled':'')+'><span class="songnum">0'+(i+1)+'</span><span class="row-main"><b>'+s.name+'</b><small>'+detail+'</small></span><em>'+action+'</em></button>';
      }).join(''):'';
      return '<p>'+intro+'</p>'+trial+playlist;
    }
    if(id==='bar')return '<p>挑一杯，'+name+'会把它递到你手里。</p>'+drinks.map((d,i)=>'<button class="choice" data-drink="'+i+'" '+(deliverDrink?'disabled':'')+'><span class="row-main"><b>'+d.name+'</b><small>'+d.place+' · '+d.desc+'</small></span><em>来一杯 ↗</em></button>').join('')+(selectedDrink?'<p class="hint">手里正拿着'+selectedDrink.name+'。</p>':'');
    if(id==='letter')return '<p>'+name+'替你把想念写成一张明信片。</p><label for="letterTo">寄给谁</label><input id="letterTo" maxlength="40" placeholder="例如：毕业后没见的室友" value="'+esc(fields.letterTo)+'"><label for="letterLine">有哪一件事想告诉对方？</label><textarea id="letterLine" maxlength="300" placeholder="例如：还记得我们在楼梯口练的第一首歌吗？">'+esc(fields.letterLine)+'</textarea><label for="letterFrom">落款</label><input id="letterFrom" maxlength="30" placeholder="你的名字或昵称" value="'+esc(fields.letterFrom)+'"><button class="act" data-act="letter">写成明信片</button>'+resultBox();
    if(id==='clip')return '<p>贴入逐字稿，'+name+'会保留原话和已有的时间码，挑三段做剪辑笔记。</p><button class="quiet" data-act="sample">用小屋访谈试试</button><label for="transcript">逐字稿 · 一段一句</label><textarea id="transcript" maxlength="20000" rows="7" placeholder="00:14 我练了三个月吉他……">'+esc(fields.transcript)+'</textarea><button class="act" data-act="clip">挑片段</button>'+resultBox();
    if(id==='road')return '<p>选一站，'+name+'为你翻出一段小屋见闻。</p><label for="town">沿途的小屋</label><select id="town">'+CabinOrigins.map((c,i)=>'<option value="'+i+'" '+(i===(fields.town||0)?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select><div id="townCard"></div>';
    if(id==='host')return '<p>'+name+'给你照看着屋里的座位。点一个空位，它给你指路。</p><div id="liveSeats">'+seatGrid()+'</div>';
    if(id==='rhyme')return '<p>'+name+'有一本常用民谣韵脚簿。给它一个句尾，它会从本子里挑同韵的词。</p><label for="rhymeLine">一句歌词或一个字</label><input id="rhymeLine" maxlength="90" placeholder="例如：我把吉他带回家" value="'+esc(fields.rhymeLine)+'"><button class="act" data-act="rhyme">翻韵脚簿</button>'+resultBox();
    const kit=!!bot.props.kit,playing=drummer===bot&&(!!nextBeat||!!kitPlayback);
    return '<p>'+name+(kit?'会随播放中的音乐跟拍。也可以选速度，听它打八小节。':'打四拍子的手鼓，用八小节陪你找节奏。')+
      '</p><label for="tempo">速度 <span id="tempoVal">'+tempo+'</span> BPM</label><input id="tempo" type="range" min="60" max="160" value="'+tempo+'" '+(kit&&playing?'disabled':'')+'> <button class="act" data-act="metronome">'+
      (playing?'收鼓':kit?'打八小节架子鼓':'打八小节')+'</button><div id="beatCount" class="hint" aria-live="off">'+(playing?beatLabel():'')+'</div>';
  }
  function townCard(){const o=CabinOrigins[draft(H.selected()).town||0],el=$('townCard');if(!el)return;el.innerHTML='<div class="note">'+esc(o.desc)+'</div><div class="origin">'+o.links.map(l=>'<a href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.title)+' ↗</a>').join(' · ')+'</div><button class="act" data-act="townKeep">收下这一站</button>';}
  function originsPanel(){
    const exhibits=H.room.exhibits||[];
    const stops=exhibits.map(e=>'<div class="exhibit-row"><button class="exhibit-info" data-story="'+esc(e.city)+'"><small>'+esc(e.city)+'</small><b>'+esc(e.item)+'</b></button><button class="quiet" aria-label="走到'+esc(e.city)+'的'+esc(e.item)+'" data-exhibit="'+esc(e.city)+'">走过去 ↗</button></div>').join('');
    const sources=CabinOrigins.map(o=>'<div class="origin"><b>'+esc(o.name)+'</b><p>'+esc(o.desc)+'</p>'+o.links.map(l=>'<a href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.title)+' ↗</a>').join(' · ')+'</div>').join('');
    return '<p>点物件名读故事，也可以走到它跟前，直接点屋里的实物。</p><div class="exhibit-stops">'+stops+'</div>'+
      '<details class="origin-sources"><summary>'+exhibits.length+' 站取材记录</summary>'+sources+'</details>'+
      '<details class="origin-sources"><summary>材质出处</summary><div class="material-credit"><b>木、石与织物</b><p>旧木地板、原木桌面、灰泥、炉边石、青石路和粗麻布取自 Poly Haven 的 CC0 实物材质。</p><a target="_blank" rel="noopener" href="https://polyhaven.com/a/wood_floor">地板原材质 ↗</a> · <a target="_blank" rel="noopener" href="https://polyhaven.com/a/wood_table_001">木材原材质 ↗</a></div></details>';
  }
  const exhibitActivities={
    成都:['letter','在桌边写明信片'],西塘:['vocal','看今晚的歌单'],阳朔:['vocal','点一首歌'],
    青岛:['beat','跟 Bot 打节拍'],拉萨:['letter','写张明信片']
  };
  function renderExhibit(city){
    const origin=CabinOrigins.find(o=>o.city===city);
    const exhibit=H.room.exhibits.find(e=>e.city===city);
    const record=origin.story, media=CabinExhibitMedia[city];
    $('exhibitTitle').textContent=exhibit.item;
    $('exhibitPlace').textContent=origin.name;
    $('exhibitObject').textContent=record.object;
    $('exhibitHistory').textContent=record.history;
    $('exhibitPerson').textContent=record.person;
    $('exhibitRole').textContent=record.role;
    $('exhibitStory').textContent=record.story;
    const image=$('exhibitImage');
    image.src=exhibit.preview
      ?exhibit.preview.toDataURL('image/webp',.88)
      :window.CabinExhibitImages?.[media.file]||'exhibit-images/'+media.file;
    image.alt=city+' · '+exhibit.item+'（'+media.kind+'）';
    $('exhibitImageKind').textContent=media.kind;
    $('exhibitCredit').textContent=media.credit;
    const action=H.entered()&&exhibitActivities[city],button=$('exhibitActivity');
    button.hidden=!action;
    if(action){button.dataset.bot=action[0];button.textContent=action[1];}
    else {delete button.dataset.bot;button.textContent='';}
    $('exhibitVisit').dataset.exhibit=city;
  }
  function render(which,id){
    currentResult=null;
    if(which==='bot'){
      const b=H.byId(id);if(!b)return;
      title((b.community?'小屋投稿':'在店伙伴')+'  /  '+b.job,b.name);
      let work=body.querySelector('.bot-work');
      const revision=String(b.revision??0);
      if(!work||work.dataset.botId!==id||work.dataset.revision!==revision){
        const outfit=b.community||publicSite?'':'<button type="button" class="quiet bot-change-outfit" data-act="outfit">换装</button>';
        body.innerHTML=`<div class="bot-card">
          <div class="bot-intro">
            <div class="bot-card-preview"><img class="portrait" alt=""></div>
            <div class="bot-bio"></div>
          </div>
          <div class="bot-work"></div>
          <section class="grok-transfer"></section>
          <footer class="bot-card-actions">
            <button type="button" class="quiet" data-go="${esc(b.id)}">走到它身边 <span aria-hidden="true">↗</span></button>
            ${outfit}
            <button type="button" class="bot-card-roster" data-act="roster">全部伙伴</button>
          </footer>
        </div>`;
        body.querySelector('.bot-card-preview img').src=CabinCharacters.portrait(b.shape,b.color,b.outfit);
        work=body.querySelector('.bot-work');work.dataset.botId=id;work.dataset.revision=revision;
        CabinGrokTransfer.mount(body.querySelector('.grok-transfer'),b,{songs,drinks,rhymeBook,room:H.room},copyToClipboard,download);
      }
      work.innerHTML=readyRole(b);
      const intro=work.firstElementChild;
      if(intro?.matches('p'))body.querySelector('.bot-bio').replaceChildren(intro);
      work.hidden=!work.firstElementChild;
      if((b.skill||b.id)==='road')townCard();
    }
    else if(which==='roster'){
      title('在场 '+H.bots.length+' / '+H.capacity+' 位 Bot','找一位 Bot');
      const community=CabinCommunity.enabled?'<button class="quiet" data-act="community">投稿名册</button>':'';
      const createLabel=CabinCommunity.enabled?'本机新增 Bot':'新增 Bot';
      const exchangeLabel=CabinCommunity.enabled?'Grok 双向迁移 ↔':'导入 Grok Bot';
      const localActions=publicSite?'':'<button class="act" data-act="createBot">＋ '+createLabel+'</button><button class="quiet" data-act="exchange">'+exchangeLabel+'</button>';
      const actions=localActions+community;
      body.innerHTML=(actions?'<div class="grok-actions roster-actions">'+actions+'</div>':'')+H.bots.map(b=>'<button class="roster-row" data-bot="'+esc(b.id)+'"><img class="portrait" src="'+esc(CabinCharacters.portrait(b.shape,b.color,b.outfit))+'" alt=""><span class="row-main"><b>'+esc(b.name)+' · '+esc(b.job)+'</b><small data-status="'+esc(b.id)+'">'+esc(b.status)+'</small></span><em>↗</em></button>').join('');
      if(H.waitingGuests.length){
        const waiting=document.createElement('details');
        waiting.className='exchange-alternate';
        waiting.innerHTML='<summary>候场伙伴（'+H.waitingGuests.length+'）</summary>'+H.waitingGuests.map(b=>
          '<button class="roster-row" data-admit="'+esc(b.id)+'"><span class="row-main"><b>'+esc(b.name)+'</b><small>'+esc(b.job)+'</small></span><em>换入场内 ↗</em></button>').join('');
        body.append(waiting);
      }
    }
    else if(which==='community'){
      title('小屋投稿','投稿名册');
      CabinCommunity.mount(body);
    }
    else if(which==='exchange'){
      const settings=id==='settings';
      title('在店伙伴',CabinCommunity.enabled||settings?'Grok 双向迁移':'导入 Grok Bot');
      CabinGrokExchange.mount(body,copyToClipboard,settings);
    }
    else if(which==='creator'){
      title(CabinCommunity.enabled?'仅自己可见':'在店伙伴','新增 Bot');
      CabinBotCreator.mount(body,raw=>{
        const response=H.createBot(raw);
        if(response.ok){H.open('bot',response.bot.id);H.toast(response.bot.name+'已加入小屋');}
        return response;
      },()=>H.open('roster'));
    }
    else if(which==='outfit'){
      const b=H.byId(id);if(!b)return;
      title('在店伙伴  /  '+b.name,'换装');
      CabinBotCreator.mountOutfit(body,b,raw=>{
        const response=H.setBotOutfit(id,raw);
        if(response.ok){H.open('bot',id);H.toast('已保存装饰');}
        return response;
      },()=>H.open('bot',id));
    }
    else if(which==='chairs'){title('听歌席  /  '+H.room.seats.length,'挑个位置');body.innerHTML='<p>挑个空位，走过去就能坐下。</p><div id="liveSeats">'+seatGrid()+'</div>';}
    else if(which==='journal'){title('随身携带','口袋手记');body.innerHTML=journal.length?'<p>已收下 '+journal.length+' 页。</p><button class="act" data-act="download">导出全部手记 ↓</button>'+journal.map((n,i)=>'<div class="note"><b>'+esc(n.title)+'</b><br>'+esc(n.text)+'</div><button class="quiet" data-copy-note="'+i+'">复制这一页</button>').join(''):'<p>口袋里还没有手记。找阿笺写张明信片，或让拾音挑一段原话，再点「放进口袋手记」。</p><button class="act" data-bot="letter">去找阿笺 ↗</button>';}
    else if(which==='origins'){title('小屋物件导览','取材手记');body.innerHTML=originsPanel();}
    else if(which==='exhibit'){renderExhibit(id);}
    else{title('屋内指引','怎么逛小屋');body.innerHTML='<p><b>操控你的黑色圆球</b><br>点地板走过去，或用 <span class="key">W A S D</span> 移动。按 <span class="key">空格</span> 跳跃，按住移动键可以跳过桌椅。拖动画面转动跟随视角，滚轮调整远近。点「全屋」看固定全景。</p><p><b>坐下和找人</b><br>点空坐垫坐下，点「起身」离座。点机器人或打开「找 Bot」可以委托工作。桌上的灯、墙上的字旗和舞台上的乐器也可以点击。按 <span class="key">Esc</span> 收起面板、停止行走或离座。</p><p><b>听演出</b><br>找'+esc(H.byId('vocal').name)+'点歌。点阿弦听吉他，点阿拍听架子鼓。右上角随时可以静音。</p><p class="hint">本场为离线演示。角色按本地规则工作，明信片和手记存于当前浏览器。</p><button class="quiet" data-act="exit">走回门口 ↗</button>';}
    const grid=$('liveSeats');if(grid)updateSeatGrid(grid);
  }
  const rhymeBook=[
    ['a','家花茶霞沙她他它下呀啊芽答','晚霞、山茶、窗花、回家、枝芽'],
    ['ang','光乡巷长窗唱响上糖堂旁藏浪房望','月光、回响、街巷、远方、故乡'],
    ['eng','风灯声梦等生冷中钟空动送冬红','晚风、路灯、回声、冬、星空'],
    ['ing','星听停青铃影醒静晴明行萤情','风铃、天晴、剪影、黎明、星星'],
    ['an','晚山岸暖慢帆看站难南蓝伴','山岚、靠岸、晚安、陪伴、远山'],
    ['ai','来海开台白爱在外怀彩','窗台、山海、留白、花开、归来'],
    ['i','你里雨语曲去期忆起溪寄衣细离依','小溪、旧衣、归期、记忆、故里'],
    ['ou','走酒口手后久舟秋留候楼头','渡口、轻舟、等候、晚秋、街头'],
    ['ao','好摇笑桥鸟照小早到遥','木桥、歌谣、知晓、飞鸟、远眺'],
    ['u','路书屋树初处土雾竹湖','归途、旧书、薄雾、江湖、小屋']
  ];
  function writeLetter(){
    const to=$('letterTo').value.trim(),detail=$('letterLine').value.trim(),from=$('letterFrom').value.trim();if(!to||!detail){H.toast('写下收信人和一件想说的事');(!to?$('letterTo'):$('letterLine')).focus();return;}
    const spot=H.seat()==null?'小屋的旧木桌':H.room.seats[H.seat()].label;const drink=selectedDrink?'眼前是刚点的'+selectedDrink.name+'。':'桌角放着一盏小灯。';
    result(selectedBot().name+'的明信片','寄给'+to+'：\n\n今晚我在'+spot+'给你写信。'+drink+'\n\n'+detail+(/[。！？…]$/.test(detail)?'':'。')+'\n\n'+(track&&!audio.paused?singer.name+'正在唱《'+track.name+'》，下次一起听。':'下次来，一起坐一会儿，听完最后一首歌。')+'\n\n'+(from||'小屋里的朋友')+'  留');
  }
  function clip(){
    const src=$('transcript').value.trim();if(!src){H.toast('先贴入逐字稿，或载入小屋访谈');return;}
    const stamp=/^\s*[\[【(（]?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)?[\]】)）]?\s*/;
    let chunks=src.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(chunks.length===1&&!/^\s*\d{1,2}:/.test(src)){chunks=src.match(/[^。！？!?]+[。！？!?]?/g)||chunks;}
    const rows=chunks.map((s,i)=>{const m=s.match(stamp),time=m?.[1]||'',text=s.slice(m?.[0]?.length||0).trim();return {i,time,text,score:(/后来|第一次|记住|终于|因为|如果|原来|才|直到|发现|害怕/.test(text)?5:0)+(/数字|[一二三四五六七八九十0-9]/.test(text)?1:0)+Math.min(text.length,60)/26-(/休息|广告|喝口水|欢迎来到|谢谢收看/.test(text)?5:0)};}).filter(r=>r.text);
    if(!rows.length){H.toast('这一段只有时间码，补几句说话内容再试试');return;}
    const picks=rows.slice().sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,3).sort((a,b)=>a.i-b.i);
    result(selectedBot().name+'的剪辑笔记',picks.map((r,i)=>{const next=rows.find(n=>n.i>r.i&&n.time);return '片段 '+(i+1)+'  ·  '+(r.time?r.time+(next?' — '+next.time:' 起'):'原文第 '+(r.i+1)+' 段')+'\n'+r.text;}).join('\n\n'));
  }
  function rhyme(){
    const input=$('rhymeLine').value.trim().replace(/[\s\p{P}\p{S}]+$/gu,'');if(!input){H.toast('先写一句歌词或一个字');return;}const last=Array.from(input).at(-1),set=rhymeBook.find(r=>r[1].includes(last));
    if(!set){$('workResult').textContent='韵脚簿里还没有「'+last+'」。可以试试以「家、光、风、星、山、海、你、酒、桥、路」结尾的句子。';$('resultActions').hidden=true;return;}
    result(selectedBot().name+'的韵脚簿','「'+input+'」\n\n可以接的韵脚：'+set[2]+'。');
  }
  body.addEventListener('input',e=>{const id=e.target.id,v=e.target.value;if(['transcript','letterTo','letterFrom','letterLine','rhymeLine'].includes(id))draft(H.selected())[id]=v;if(id==='tempo'){tempo=Number(v);$('tempoVal').textContent=v;}});
  body.addEventListener('change',e=>{if(e.target.id==='town'){draft(H.selected()).town=Number(e.target.value);townCard();}});
  function handleAction(e){const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
    if(d.exhibit){H.visitExhibit(d.exhibit);return;}
    if(d.story){H.open('exhibit',d.story);return;}
    if(d.act==='exhibits'){H.open('origins');return;}
    if(d.act==='exchange'){H.open('exchange',d.settings);return;}
    if(d.act==='outfit'){H.open('outfit',H.selected());return;}
    if(d.act==='community'){H.open('community');return;}
    if(d.admit){H.visitWaitingGuest(d.admit);return;}
    if(d.bot){H.open('bot',d.bot);return;}if(d.go){H.goBot(d.go);return;}if(d.seat!==undefined){H.chooseSeat(H.room.seats[+d.seat]);return;}
    if(d.song){if(singer===selectedBot()&&track?.id===d.song&&!audio.paused)pauseSong();else playSong(d.song,selectedBot());return;}
    if(d.drink!==undefined){orderDrink(+d.drink);return;}if(d.copyNote!==undefined){copyText(journal[+d.copyNote].text);return;}
    switch(d.act){case 'exit':H.backToDoor();break;case 'roster':H.open('roster');break;case 'createBot':H.open('creator');break;case 'sample':draft(H.selected()).transcript=sample;$('transcript').value=sample;break;case 'clip':clip();break;case 'letter':writeLetter();break;case 'rhyme':rhyme();break;case 'keep':if(currentResult)saveNote(currentResult.title,currentResult.text);break;case 'copy':if(currentResult)copyText(currentResult.text);break;case 'townKeep':{const o=CabinOrigins[draft(H.selected()).town||0];saveNote(o.name,o.desc+'\n'+o.links[0].url);break;}case 'guitar':playGuitar();break;case 'metronome':playBeat();break;case 'download':download('小屋口袋手记.txt',journal.map(n=>n.title+'\n'+n.text).join('\n\n────\n\n'));break;}
  }
  body.addEventListener('click',handleAction);
  $('exhibitDialog').addEventListener('click',handleAction);
  function tick(dt){
    frameClock+=dt;
    const now=roomTime();
    if(deliverDrink&&now>=orderUntil)deliverDrink();
    if(nextBeat&&now>=nextBeat)hitBeat();
    if(kitPlayback){
      const played=ctx.currentTime-kitPlayback.start;
      const beat=Math.max(0,Math.min(drumSteps/2,Math.floor(played/(kitPlayback.step*2))+1));
      if(beat!==beatNum){beatNum=beat;showBeat();}
    }
    if(H.player.hasCup){
      const left=Math.max(0,(sipTime-now)/740);
      H.player.sipMix=Math.sin(Math.PI*left);
      if(!left&&!selectedDrink)H.player.hasCup=false;
    }
    if(frameClock>.85){frameClock=0;if(!H.drawer())return;
      if(H.drawer()==='roster')for(const el of body.querySelectorAll('[data-status]')){
        const status=H.byId(el.dataset.status).status;if(el.textContent!==status)el.textContent=status;
      }
      const grid=$('liveSeats');if(grid)updateSeatGrid(grid);
    }
  }
  function leave(){
    stopBeat();stopGuitar();audio.pause();resumeSong=false;track=null;singer=null;syncMusic();
    deliverDrink=null;orderUntil=0;bartender=null;selectedDrink=null;sips=0;sipBtn.hidden=true;
    H.player.hasCup=false;H.player.cup.visible=false;H.player.sipMix=0;sipTime=0;
  }
  window.CabinWork={render,unlock,tick,leave,setPaused,singing,playingGuitar,guitarCue,guitarStroke,kitCue,vocalCue,followingMusic,isBeating,
    isServing:id=>(!id||bartender?.id===id)&&!!deliverDrink};
  if(!publicSite)CabinGrokExchange.init();
  CabinCommunity.init();
})();
