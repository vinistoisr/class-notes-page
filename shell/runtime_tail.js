
  // ---------- Shared tail: answer frames, notes, layout, navigation ----------
  [].forEach.call(document.querySelectorAll(".addframe"),function(b){b.addEventListener("click",function(){
    var ta=document.getElementById(b.dataset.target),tpl=b.closest(".frame").querySelector("pre").textContent;
    ta.value=ta.value.trim()?ta.value.replace(/\s+$/,"")+"\n\n"+tpl:tpl;ta.dispatchEvent(new Event("input",{bubbles:true}));
    var sec=ta.closest("section");if(sec.classList.contains("nc")&&sec._nt)sec._nt.click();
    b.textContent="Added";setTimeout(function(){b.textContent="Add to my notes"},2000)})});

  // Two-column layout inside each step: .viz (or [data-col=a]) left, the rest right; .side or [data-col=b] forces right.
  [].forEach.call(document.querySelectorAll("section.topic>.main"),function(m){
    if(m.classList.contains("nosplit"))return;
    var kids=[].slice.call(m.children).filter(function(k){return !k.classList.contains("head")&&!k.classList.contains("idea")});
    if(!kids.some(function(k){return k.classList.contains("viz")}))return;
    var cols=document.createElement("div"),a=document.createElement("div"),b=document.createElement("div");cols.className="cols "+(m.dataset.cols||"");a.className="colA";b.className="colB";
    kids.forEach(function(k){var toB=k.dataset.col==="b"||k.classList.contains("side")||(!k.classList.contains("viz")&&k.dataset.col!=="a");(toB?b:a).appendChild(k)});
    cols.appendChild(a);if(b.children.length)cols.appendChild(b);else cols.classList.add("solo");m.appendChild(cols);
    cols._home=[[].slice.call(a.children),[].slice.call(b.children)]});
  // Balance the two columns: if the right one runs longer, move its last blocks under the left one while that shortens the step.
  function balance(){[].forEach.call(document.querySelectorAll(".cols"),function(c){if(!c._home||c.classList.contains("solo"))return;
    var a=c.children[0],b=c.children[1];if(!b)return;c._home[0].forEach(function(k){a.appendChild(k)});c._home[1].forEach(function(k){b.appendChild(k)});
    if(getComputedStyle(c).display!=="grid")return;
    while(b.children.length>1){var before=Math.max(a.offsetHeight,b.offsetHeight);if(b.offsetHeight-a.offsetHeight<60)break;var k=b.lastElementChild;a.appendChild(k);
      if(Math.max(a.offsetHeight,b.offsetHeight)>=before){b.appendChild(k);break}}})}
  var balT;function rebalance(){clearTimeout(balT);balT=setTimeout(balance,120)}
  window.addEventListener("resize",rebalance);

  // Notes: per topic {text, t}; saved to the viewer's private db doc, with a browser copy as backup.
  var LS=PAGE.notesKey, notes={}, ref=null, timer=null, saving=false, again=false, remoteOK=false;
  var areas=[].slice.call(document.querySelectorAll("textarea[data-topic]"));
  var statusEl=document.getElementById("save-status");
  function setStatus(t,warn){statusEl.textContent=t;statusEl.classList.toggle("warn",!!warn)}
  function lsLoad(){try{return JSON.parse(localStorage.getItem(LS)||"{}")||{}}catch(e){return {}}}
  function lsSave(){try{localStorage.setItem(LS,JSON.stringify(notes))}catch(e){}}
  function stamp(id){var s=document.querySelector('em[data-for="'+id+'"]');var n=notes[id];if(!s)return;
    s.textContent=(n&&n.t)?"edited "+new Date(n.t).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):""}
  function fill(){areas.forEach(function(a){var id=a.dataset.topic;if(document.activeElement!==a)a.value=(notes[id]&&notes[id].text)||"";stamp(id)})}
  notes=lsLoad(); fill();
  function schedule(){clearTimeout(timer);timer=setTimeout(flush,1200)}
  async function flush(){
    if(!ref||!remoteOK)return;
    if(saving){again=true;return}
    saving=true;setStatus("Saving...");
    try{await ref.set({notes:notes,updated:Date.now()});setStatus("Saved to your account")}
    catch(e){
      if(e&&e.code==="unavailable"){setStatus("Offline, kept on this device",true);setTimeout(schedule,4000)}
      else{remoteOK=false;setStatus("Saved on this device only",true)}
    }
    saving=false;
    if(again){again=false;flush()}
  }
  areas.forEach(function(a){a.addEventListener("input",function(){
    var id=a.dataset.topic;notes[id]={text:a.value,t:Date.now()};lsSave();stamp(id);
    if(remoteOK){setStatus("Editing...");schedule()}
  })});
  (async function(){
    var c=window.claude; if(!c||!c.use){setStatus("Saved on this device only",true);return}
    try{
      var res=await Promise.all([c.use("db"),c.use("user")]);var db=res[0],user=res[1];
      if(!db||!user){setStatus("Saved on this device only",true);return}
      var uid=await user.id(); if(!uid){setStatus("Saved on this device only",true);return}
      ref=db.doc("data/users/"+uid+"/"+PAGE.notesDoc);
      var snap=await ref.get(),remote=(snap.exists&&snap.data().notes)||{},localNewer=false;
      Object.keys(remote).forEach(function(k){var r=remote[k],l=notes[k];if(r&&(!l||r.t>l.t))notes[k]={text:r.text,t:r.t}});
      Object.keys(notes).forEach(function(k){var r=remote[k];if(!r||notes[k].t>r.t)localNewer=true});
      remoteOK=true;lsSave();fill();setStatus("Saved to your account");
      if(localNewer)flush();
    }catch(e){setStatus("Saved on this device only",true)}
  })();

  document.getElementById("copy-all").addEventListener("click",function(){
    var out=areas.map(function(a){var lab=document.querySelector('label[for="'+a.id+'"]');var h=a.closest("section").querySelector("h2").textContent+(lab&&lab.firstChild.textContent.trim()!=="Notes"?" ("+lab.firstChild.textContent.trim()+")":"");return "## "+h+"\n"+(a.value.trim()||"(no notes)")}).join("\n\n");
    var msg=document.getElementById("copy-msg");
    function fallback(){var t=document.createElement("textarea");t.value=out;document.body.appendChild(t);t.select();try{document.execCommand("copy");msg.textContent="Copied"}catch(e){msg.textContent="Select and copy manually"}t.remove()}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(out).then(function(){msg.textContent="Copied"},fallback)}else fallback();
    setTimeout(function(){msg.textContent=""},2500);
  });


  // Note pads: per-step toggle plus one switch in the top bar for all of them (key N). Remembered in this browser.
  (function(){
    var NK=PAGE.notesKey+"-closed",closed={};
    try{closed=JSON.parse(localStorage.getItem(NK)||"{}")||{}}catch(e){}
    var secs=[].slice.call(document.querySelectorAll("section.topic")).filter(function(x){return x.querySelector(":scope>.notes")});
    var all=document.getElementById("notes-all");
    function save(){try{localStorage.setItem(NK,JSON.stringify(closed))}catch(e){}}
    function paint(){var n=0;secs.forEach(function(sec){var c=!!closed[sec.id];if(c)n++;sec.classList.toggle("nc",c);var b=sec._nt;b.textContent=c?"Show notes":"Hide notes";b.setAttribute("aria-expanded",!c)});
      var allClosed=n===secs.length;rebalance();all.textContent=allClosed?"Notes: off":"Notes: on";all.setAttribute("aria-pressed",!allClosed);all.title=(allClosed?"Show":"Hide")+" every notes panel (N)"}
    secs.forEach(function(sec){var b=document.createElement("button");b.type="button";b.className="nt";b.setAttribute("aria-controls",sec.querySelector(":scope>.notes textarea").id);
      b.addEventListener("click",function(){closed[sec.id]=!closed[sec.id];save();paint();if(!closed[sec.id])sec.querySelector(":scope>.notes textarea").focus()});
      sec.querySelector(".head").appendChild(b);sec._nt=b});
    function toggleAll(){var close=all.getAttribute("aria-pressed")==="true";secs.forEach(function(sec){closed[sec.id]=close});save();paint()}
    all.addEventListener("click",toggleAll);
    paint();balance();
    // Keyboard: N toggles all notes, J / K jump to the next / previous step.
    var steps=[].slice.call(document.querySelectorAll("section.topic"));
    document.addEventListener("keydown",function(e){
      var t=e.target,typing=t&&(t.tagName==="TEXTAREA"||t.tagName==="INPUT"||t.tagName==="SELECT"||t.isContentEditable);
      if(typing||e.ctrlKey||e.metaKey||e.altKey)return;
      var k=e.key.toLowerCase();
      if(k==="n"){e.preventDefault();toggleAll();return}
      if(k==="j"||k==="k"){e.preventDefault();var top=document.getElementById("topbar").getBoundingClientRect().bottom+12;
        var i=steps.findIndex(function(s){return s.getBoundingClientRect().top>top+4});if(i<0)i=steps.length;
        var cur=i-1,target=k==="j"?steps[Math.min(i,steps.length-1)]:steps[Math.max(cur-(steps[cur]&&steps[cur].getBoundingClientRect().top>top-8?1:0),0)];
        if(target)target.scrollIntoView({block:"start"})}
    });
  })();

  // Sticky bar height drives scroll offsets and chart heights.
  (function(){var bar=document.getElementById("topbar");function set(){document.documentElement.style.setProperty("--navh",bar.offsetHeight+"px")}set();window.addEventListener("resize",set)})();

  var links=[].slice.call(document.querySelectorAll("nav.toc a"));
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(l){l.classList.toggle("on",l.getAttribute("href")==="#"+e.target.id)})}})},{rootMargin:"-30% 0px -60% 0px"});
    links.forEach(function(l){var s=document.querySelector(l.getAttribute("href"));if(s)io.observe(s)});
  }
