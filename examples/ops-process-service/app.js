  // 1. Zoom levels
  (function(){
    var s=document.getElementById("z-chart");arrowDef(s,"az","var(--muted)");
    var L=[
      ["Value chain","Stages, often run by different organizations","Pre-hospital care, the emergency department, imaging, surgery, intensive care and rehab are separate units with separate budgets. A wait often sits at the boundary between two of them."],
      ["Process","Steps, handoffs and waits inside one stage","Inside the emergency department the patient moves through triage, resuscitation and imaging, with waits in between. This is where you map, measure and find the bottleneck."],
      ["Encounter","What the patient and family see","Front stage: being met, assessed, scanned and told the plan. Back stage: bed requests, booking the scanner and the operating room. The line of visibility separates them."]];
    function chev(x,y,w,h,fill,stroke,label,on){var p="M"+x+","+y+" L"+(x+w-14)+","+y+" L"+(x+w)+","+(y+h/2)+" L"+(x+w-14)+","+(y+h)+" L"+x+","+(y+h)+" L"+(x+14)+","+(y+h/2)+" z";
      el("path",{d:p,fill:fill,stroke:stroke,"stroke-width":on?2.5:1},s);lines(s,x+w/2+4,y+h/2-(label.length-1)*7+4,label,{anchor:"middle",size:12.5,weight:700,fill:on?"var(--paper)":"var(--ink)",lh:14})}
    function box(x,y,w,h,label,fill,ink){el("rect",{x:x,y:y,width:w,height:h,rx:7,fill:fill,stroke:"var(--accent)","stroke-width":1.5},s);lines(s,x+w/2,y+h/2-(label.length-1)*7+4,label,{anchor:"middle",size:12,weight:700,fill:ink||"var(--ink)",lh:14})}
    function wait(x,y){el("path",{d:"M"+(x-13)+","+(y-11)+" L"+(x+13)+","+(y-11)+" L"+x+","+(y+12)+" z",fill:"var(--signal-soft)",stroke:"var(--signal)","stroke-width":1.5},s)}
    function arr(x1,y1,x2,y2){el("line",{x1:x1,y1:y1,x2:x2,y2:y2,stroke:"var(--muted)","stroke-width":1.5,"marker-end":"url(#az)"},s)}
    function draw(k){clear(s);arrowDef(s,"az","var(--muted)");
      if(k===0){var st=[["Pre-","hospital"],["Emergency","dept"],["Imaging"],["Surgery"],["ICU /","ward"],["Rehab,","discharge"]];
        st.forEach(function(n,i){var on=i===1;chev(8+i*111,70,118,74,on?"var(--accent)":"var(--accent-soft)","var(--accent)",n,on)});
        txt(s,340,40,"Each stage is often a different unit, budget or organization",{anchor:"middle",size:13});
        for(var i=1;i<6;i++){var x=18+i*111;el("circle",{cx:x,cy:170,r:5,fill:"var(--signal)"},s)}
        txt(s,340,198,"Amber dots = handoffs between units, where waits tend to sit",{anchor:"middle",size:12.5,fill:"var(--signal)",weight:700});
        txt(s,119+55,226,"▲ zoom in on this stage next",{anchor:"middle",size:11.5,fill:"var(--accent)"});}
      else if(k===1){var xs=[12,128,244,360,476,592],lab=[["Arrive"],["Triage"],["Resus"],["CT"],["Decide"],["OR / ICU"]];
        xs.forEach(function(x,i){box(x,96,76,48,lab[i],i===2||i===3||i===5?"var(--accent-soft)":"var(--paper)");if(i<5){var mx=x+76+20;arr(x+76,120,mx-14,120);wait(mx,120);arr(mx+14,120,xs[i+1],120)}});
        txt(s,340,50,"Activities (boxes) and waits (triangles) inside the emergency department",{anchor:"middle",size:13});
        txt(s,340,190,"Shaded boxes add value. The triangles are often most of the clock time.",{anchor:"middle",size:12.5,fill:"var(--signal)",weight:700});}
      else{txt(s,14,30,"FRONT STAGE · what the patient sees",{size:11.5,weight:700,mono:true,fill:"var(--accent)"});
        ["Met at the door","Assessed","Scanned","Told the plan","Moved to a bed"].forEach(function(t,i){box(14+i*132,44,116,44,[t],"var(--accent-soft)")});
        el("line",{x1:8,y1:124,x2:672,y2:124,stroke:"var(--signal)","stroke-width":2,"stroke-dasharray":"7 5"},s);
        txt(s,672,116,"line of visibility",{anchor:"end",size:11.5,weight:700,fill:"var(--signal)"});
        txt(s,14,152,"BACK STAGE · support the patient never sees",{size:11.5,weight:700,mono:true,fill:"var(--muted)"});
        ["Pre-alert call","Team paged","CT booked","OR scheduled","Bed found"].forEach(function(t,i){box(14+i*132,166,116,44,[t],"var(--paper)");arr(72+i*132,166,72+i*132,92)});}
      card("z-card",L[k][0],L[k][1],L[k][2])}
    chipset(document.getElementById("z-chips"),L.map(function(l){return l[0]}),0,draw);draw(0);
  })();

  // 2. Swimlane map
  (function(){
    var s=document.getElementById("map-chart"),showW=true,showVA=false;
    var lanes=["Paramedics","Trauma team","Imaging","Surgery"],LT=26,LH=72,LX=96;
    var N=[
      {id:"pre",lane:0,x:160,t:"task",l:["Pre-alert","call"],c:"n",d:"Paramedics phone ahead with mechanism of injury and vital signs, so the team is assembled before the patient arrives. Information flows ahead of the patient."},
      {id:"hand",lane:0,x:265,t:"task",l:["Handover"],c:"n",d:"Structured handover at the bedside, often in a fixed format such as MIST (mechanism, injuries, signs, treatment). Necessary but adds no treatment."},
      {id:"res",lane:1,x:265,t:"task",l:["Primary survey","+ resus"],c:"v",d:"Airway, breathing, circulation, disability, exposure. Value added: this changes the patient's condition. The trauma bay is a shared, fixed resource."},
      {id:"w1",lane:2,x:355,t:"wait",l:["Wait for CT"],c:"w",d:"The patient waits for the scanner and a transfer team. A common bottleneck when one scanner serves the whole emergency department."},
      {id:"ct",lane:2,x:445,t:"task",l:["CT scan"],c:"v",d:"Diagnostic imaging. Value added. Some hospitals put a scanner in or beside the trauma bay to remove the transfer and the wait."},
      {id:"dec",lane:1,x:445,t:"dec",l:["Surgery?"],c:"n",d:"Decision point. The decision waits for the scan report and a surgeon's review, so a slow report delays everything after it."},
      {id:"w2",lane:3,x:548,t:"wait",l:["Wait for OR"],c:"w",d:"Waiting for an operating room and a team. Elective cases compete for the same rooms unless one is held open for trauma."},
      {id:"or",lane:3,x:625,t:"task",l:["Operation"],c:"v",d:"Value added. The surgery itself."},
      {id:"w3",lane:1,x:515,t:"wait",l:["Wait for bed"],c:"w",d:"Boarding: the patient is treated but stays in the emergency department because no ward or intensive care bed is free. It blocks the trauma bay for the next patient."},
      {id:"adm",lane:1,x:625,t:"task",l:["Admit to","ward / ICU"],c:"n",d:"Transfer to the inpatient unit. Necessary, not value added."}];
    var E=[["pre","hand"],["hand","res"],["res","w1"],["w1","ct"],["ct","dec"],["dec","w2","yes"],["w2","or"],["dec","w3","no"],["w3","adm"]];
    var byId={};N.forEach(function(n){byId[n.id]=n});
    var CC={v:["var(--good-soft)","var(--good)","Value added"],n:["var(--paper)","var(--accent)","Necessary, not value added"],w:["var(--signal-soft)","var(--signal)","Wait (waste)"]};
    function cy(n){return LT+n.lane*LH+LH/2}
    function edges(){if(showW)return E;var out=[];E.forEach(function(e){if(byId[e[0]].t==="wait")return;var to=byId[e[1]];if(to.t==="wait"){var nx=E.filter(function(f){return f[0]===to.id})[0];out.push([e[0],nx[1],e[2]])}else out.push(e)});return out}
    var sel="res";
    function draw(){clear(s);arrowDef(s,"am","var(--muted)");
      lanes.forEach(function(l,i){var y=LT+i*LH;el("rect",{x:0,y:y,width:680,height:LH,fill:i%2?"var(--bg)":"var(--paper)",stroke:"var(--line)"},s);
        el("rect",{x:0,y:y,width:LX-6,height:LH,fill:"var(--accent-soft)"},s);lines(s,8,y+LH/2-(l.indexOf(" ")>0&&l.length>10?3:-4),l.length>10?l.split(" "):[l],{size:12,weight:700,fill:"var(--accent)",lh:14})});
      txt(s,LX,16,"Time runs left to right →",{size:11.5,mono:true});
      edges().forEach(function(e){var a=byId[e[0]],b=byId[e[1]],x1=a.x,y1=cy(a),x2=b.x,y2=cy(b),hw=function(n){return n.t==="wait"?16:n.t==="dec"?34:46};
        var d;if(y1===y2)d="M"+(x1+hw(a))+","+y1+" L"+(x2-hw(b))+","+y2;
        else if(x1===x2)d="M"+x1+","+(y1+(y2>y1?22:-22))+" L"+x2+","+(y2+(y2>y1?-22:22));
        else{var mx=x2;d="M"+(x1+hw(a))+","+y1+" L"+mx+","+y1+" L"+mx+","+(y2+(y2>y1?-22:22))}
        var cross=a.lane!==b.lane;el("path",{d:d,fill:"none",stroke:cross?"var(--signal)":"var(--muted)","stroke-width":cross?2:1.5,"marker-end":"url(#am)"},s);
        if(e[2])txt(s,(y1===y2?(x1+x2)/2:x2+6),(y1===y2?y1-6:(y1+y2)/2+4),e[2],{size:11,weight:700,fill:"var(--muted)",anchor:y1===y2?"middle":"start"})});
      N.forEach(function(n){if(n.t==="wait"&&!showW)return;var g=el("g",{},s),y=cy(n),on=n.id===sel,col=showVA?CC[n.c]:[n.t==="wait"?"var(--signal-soft)":"var(--paper)",n.t==="wait"?"var(--signal)":"var(--accent)"];
        var sw=on?3:1.5;
        if(n.t==="task")el("rect",{x:n.x-46,y:y-21,width:92,height:42,rx:6,fill:col[0],stroke:col[1],"stroke-width":sw},g);
        else if(n.t==="dec")el("path",{d:"M"+(n.x-34)+","+y+" L"+n.x+","+(y-24)+" L"+(n.x+34)+","+y+" L"+n.x+","+(y+24)+" z",fill:col[0],stroke:col[1],"stroke-width":sw},g);
        else el("path",{d:"M"+(n.x-16)+","+(y-15)+" L"+(n.x+16)+","+(y-15)+" L"+n.x+","+(y+14)+" z",fill:col[0],stroke:col[1],"stroke-width":sw},g);
        if(n.t==="wait")txt(g,n.x,y+29,n.l[0],{anchor:"middle",size:10.5,weight:700,fill:"var(--signal)"});
        else lines(g,n.x,y+4-(n.l.length-1)*6.5,n.l,{anchor:"middle",size:11,weight:700,fill:"var(--ink)",lh:13});
        hit(g,n.l.join(" "),function(){sel=n.id;draw();pick()})});
    }
    function pick(){var n=byId[sel];card("map-card",n.l.join(" "),lanes[n.lane]+" · "+CC[n.c][2],n.d)}
    function sum(){var c={v:0,n:0,w:0};N.forEach(function(n){c[n.c]++});var hand=E.filter(function(e){return byId[e[0]].lane!==byId[e[1]].lane}).length;
      tiles("map-sum",[[c.v,"value-added steps","var(--good)"],[c.n,"necessary, not value added"],[c.w,"waits","var(--signal)"],[hand,"handoffs between lanes (amber arrows)","var(--signal)"]])}
    var lg=document.getElementById("map-legend");
    function legend(){lg.innerHTML="";(showVA?["v","n","w"]:["n","w"]).forEach(function(k){var sp=document.createElement("span");var i=document.createElement("i");i.style.background=showVA?CC[k][0]:(k==="w"?"var(--signal-soft)":"var(--paper)");i.style.borderColor=showVA?CC[k][1]:(k==="w"?"var(--signal)":"var(--accent)");sp.appendChild(i);sp.appendChild(document.createTextNode(showVA?CC[k][2]:(k==="w"?"Wait":"Activity or decision")));lg.appendChild(sp)});
      var sp=document.createElement("span");sp.innerHTML='<i style="border:0;height:3px;background:var(--signal)"></i>';sp.appendChild(document.createTextNode("Handoff between lanes"));lg.appendChild(sp)}
    var bw=document.getElementById("m-waits"),bv=document.getElementById("m-va");
    function btns(){bw.classList.toggle("on",showW);bw.setAttribute("aria-pressed",showW);bv.classList.toggle("on",showVA);bv.setAttribute("aria-pressed",showVA)}
    bw.addEventListener("click",function(){showW=!showW;if(!showW&&byId[sel].t==="wait")sel="res";btns();draw();pick()});
    bv.addEventListener("click",function(){showVA=!showVA;btns();legend();draw()});
    btns();legend();draw();pick();sum();
  })();

  // 3. Bottleneck builder
  (function(){
    var K="mba535-s4-steps",EX=[["Triage",5,1],["Resuscitation",30,2],["CT scan",15,1],["Surgeon review",20,1],["Transfer out",25,2]];
    var rows=ls(K,null);if(!Array.isArray(rows)||!rows.length)rows=EX.map(function(r){return r.slice()});
    var tb=document.getElementById("bn-body"),lam=document.getElementById("bn-lam"),wh=document.getElementById("bn-w"),s=document.getElementById("bn-chart");
    function cap(r){var m=+r[1],n=+r[2];return m>0&&n>0?60/m*n:0}
    function build(){tb.innerHTML="";rows.forEach(function(r,i){var tr=document.createElement("tr");
      [0,1,2].forEach(function(c){var td=document.createElement("td"),inp=document.createElement("input");inp.type=c?"number":"text";inp.id="bn-"+i+"-"+c;if(c){inp.min=c===1?"0.5":"1";inp.step=c===1?"0.5":"1";inp.inputMode="decimal"}inp.value=r[c];inp.setAttribute("aria-label",["Step name","Minutes per patient","Parallel resources"][c]+", row "+(i+1));
        inp.addEventListener("input",function(){r[c]=c?parseFloat(inp.value)||0:inp.value;lsw(K,rows);calc()});td.appendChild(inp);tr.appendChild(td)});
      var c1=document.createElement("td");c1.className="numc";tr.appendChild(c1);var c2=document.createElement("td");c2.className="numc";tr.appendChild(c2);
      var c3=document.createElement("td"),rm=document.createElement("button");rm.type="button";rm.className="rm";rm.textContent="×";rm.setAttribute("aria-label","Remove "+(r[0]||"step"));rm.addEventListener("click",function(){rows.splice(i,1);lsw(K,rows);build()});c3.appendChild(rm);tr.appendChild(c3);
      r._c=[c1,c2];tb.appendChild(tr)});calc()}
    function calc(){var L=+lam.value,W=+wh.value;document.getElementById("bn-lam-out").textContent=L+" /hr";document.getElementById("bn-w-out").textContent=W+" h";
      var caps=rows.map(cap),valid=caps.filter(function(c){return c>0}),min=valid.length?Math.min.apply(null,valid):0,bi=caps.indexOf(min);
      rows.forEach(function(r,i){var c=caps[i],u=c?L/c:0;r._c[0].textContent=c?f1(c):"·";r._c[1].textContent=c?Math.round(u*100)+"%":"·";r._c[1].style.color=u>=1?"var(--bad)":u>=.85?"var(--signal)":"var(--ink)";r._c[0].style.fontWeight=i===bi?"700":"400"});
      clear(s);var LX=130,RX=600,T=20,bh=Math.max(14,Math.min(30,(180)/Math.max(rows.length,1)-8)),gap=8,max=Math.max(min*1.2,L*1.3,Math.max.apply(null,caps.concat([1]))),X=function(v){return LX+(RX-LX)*Math.min(v,max)/max};
      var H=T+rows.length*(bh+gap)+40;s.setAttribute("viewBox","0 0 680 "+Math.max(H,120));
      [0,max/4,max/2,max*3/4,max].forEach(function(v){el("line",{x1:X(v),y1:T-6,x2:X(v),y2:T+rows.length*(bh+gap),stroke:"var(--line)"},s);txt(s,X(v),T+rows.length*(bh+gap)+16,f1(v),{anchor:"middle",mono:true,size:10.5})});
      txt(s,RX,T+rows.length*(bh+gap)+32,"patients per hour",{anchor:"end",size:11});
      rows.forEach(function(r,i){var y=T+i*(bh+gap),c=caps[i],isB=i===bi&&c>0,over=c&&L>c;
        txt(s,LX-8,y+bh/2+4,(r[0]||"Step "+(i+1)).slice(0,18),{anchor:"end",size:12.5,weight:isB?700:400,fill:"var(--ink)"});
        el("rect",{x:LX,y:y,width:Math.max(X(c)-LX,1),height:bh,rx:4,fill:isB?"var(--bad)":"var(--accent)",opacity:isB?1:.75},s);
        if(isB)txt(s,X(c)+6,y+bh/2+4,"bottleneck",{size:11.5,weight:700,fill:"var(--bad)"});
        if(over&&!isB)txt(s,X(c)+6,y+bh/2+4,"over capacity",{size:11,fill:"var(--bad)"})});
      el("line",{x1:X(L),y1:T-2,x2:X(L),y2:T+rows.length*(bh+gap)-gap+4,stroke:"var(--signal)","stroke-width":2.5,"stroke-dasharray":"6 4"},s);
      txt(s,X(L),T-8+ -2,"arrivals "+L+"/hr",{anchor:X(L)>RX-60?"end":"middle",size:11.5,weight:700,fill:"var(--signal)"});
      var tot=rows.reduce(function(a,r){return a+(+r[1]||0)},0),u=min?L/min:0,b=rows[bi];
      tiles("bn-sum",[[b&&min?(b[0]||"Step "+(bi+1)):"·","bottleneck","var(--bad)"],[min?f1(min)+" /hr":"·","process capacity"],[min?Math.round(u*100)+"%":"·",u>=1?"bottleneck busy: queue grows "+f1(L-min)+"/hr":"bottleneck utilization",u>=1?"var(--bad)":u>=.85?"var(--signal)":""],[Math.round(tot)+" min","activity time, no waiting"],[f1(L*W),"in the department (L = λW = "+L+" × "+W+")"],[tot?Math.round(tot/60/W*100)+"%":"·","of time spent in activities"]])}
    lam.addEventListener("input",calc);wh.addEventListener("input",calc);
    document.getElementById("bn-add").addEventListener("click",function(){rows.push(["New step",10,1]);lsw(K,rows);build();var i=document.getElementById("bn-"+(rows.length-1)+"-0");if(i){i.focus();i.select()}});
    document.getElementById("bn-reset").addEventListener("click",function(){rows=EX.map(function(r){return r.slice()});lsw(K,rows);build()});
    build();
  })();

  // 4. Queues M/M/s
  function mms(l,m,sv){var a=l/m,r=a/sv;if(r>=1)return null;var sum=0,fact=1;for(var n=0;n<sv;n++){if(n>0)fact*=n;sum+=Math.pow(a,n)/fact}var fs=fact*(sv>0?sv:1);if(sv===1)fs=1;
    var fsv=1;for(var k=2;k<=sv;k++)fsv*=k;var p0=1/(sum+Math.pow(a,sv)/(fsv*(1-r)));var lq=p0*Math.pow(a,sv)*r/(fsv*Math.pow(1-r,2));return {r:r,p0:p0,lq:lq,l:lq+a,wq:lq/l,w:lq/l+1/m}}
  (function(){
    var il=document.getElementById("q-lam"),im=document.getElementById("q-mu"),is=document.getElementById("q-s"),s=document.getElementById("q-chart");
    var SC=["var(--accent)","var(--good)","var(--c3)"];
    function draw(){var l=+il.value,m=+im.value,sv=+is.value;document.getElementById("q-lam-out").textContent=l;document.getElementById("q-mu-out").textContent=m;document.getElementById("q-s-out").textContent=sv;
      var q=mms(l,m,sv);
      if(!q)tiles("q-sum",[[Math.round(l/(m*sv)*100)+"%","utilization: arrivals exceed capacity","var(--bad)"],["∞","the line grows without limit; add a server or speed up service","var(--bad)"]]);
      else tiles("q-sum",[[Math.round(q.r*100)+"%","server utilization (ρ)",q.r>=.85?"var(--signal)":""],[f2(q.lq),"average number waiting (Lq)"],[f2(q.l),"average number in the system (L)"],[f1(q.wq*60)+" min","average wait in line (Wq)",q.wq*60>30?"var(--bad)":""],[f1(q.w*60)+" min","average time in the system (W)"],[Math.round(q.p0*100)+"%","of the time the system is empty (P0)"]]);
      clear(s);var L=58,R=600,T=26,B=232,cur=q?q.wq*60:0,opts=[15,30,60,120,240,480],ym=opts.filter(function(o){return o>=Math.max(cur*1.6,15)})[0]||480;
      var X=function(r){return L+(R-L)*r},Y=function(v){return B-(B-T)*Math.min(v,ym)/ym};
      [0,.25,.5,.75,1].forEach(function(r){el("line",{x1:X(r),y1:T,x2:X(r),y2:B,stroke:"var(--line)"},s);txt(s,X(r),B+16,Math.round(r*100)+"%",{anchor:"middle",mono:true,size:10.5})});
      [0,ym/2,ym].forEach(function(v){el("line",{x1:L,y1:Y(v),x2:R,y2:Y(v),stroke:"var(--line)"},s);txt(s,L-6,Y(v)+4,v+"",{anchor:"end",mono:true,size:10.5})});
      txt(s,4,12,"wait (min)",{size:10.5,mono:true});txt(s,R,B+34,"utilization ρ",{anchor:"end",size:11});
      el("rect",{x:X(.85),y:T,width:X(1)-X(.85),height:B-T,fill:"var(--bad-soft)",opacity:.6},s);txt(s,X(.925),B-8,"danger zone",{anchor:"middle",size:10.5,weight:700,fill:"var(--bad)"});
      var sets=[1,2,3];if(sv>3)sets.push(sv);
      sets.forEach(function(k,ci){var d="",clip=false;for(var r=.02;r<.985;r+=.01){var qq=mms(r*k*m,m,k);if(!qq)break;var v=qq.wq*60;if(v>ym){if(!clip){d+=(d?" L":"M")+X(r)+","+Y(ym);clip=true}break}d+=(d?" L":"M")+X(r)+","+Y(v)}
        var col=SC[ci]||"var(--ink)";el("path",{d:d,fill:"none",stroke:col,"stroke-width":k===sv?3.5:2,opacity:k===sv?1:.6},s);
        txt(s,R+6,T+18+ci*16,k+(k===1?" server":" servers"),{size:11.5,weight:k===sv?700:400,fill:col})});
      if(q){el("circle",{cx:X(q.r),cy:Y(cur),r:7,fill:"var(--signal)",stroke:"var(--paper)","stroke-width":2},s);txt(s,X(q.r)+(q.r>.75?-10:10),Y(cur)-10,f1(cur)+" min",{anchor:q.r>.75?"end":"start",size:12,weight:700,fill:"var(--signal)"})}
      var one=mms(l/2,m,1),two=mms(l,m,2);
      if(one&&two)card("q-pool","Pooling test at λ = "+l+", μ = "+m,"Two servers, same utilization ("+Math.round(two.r*100)+"%)","Two separate lines, half the patients each: "+f1(one.wq*60)+" min average wait. One shared line for both: "+f1(two.wq*60)+" min. Same staff and demand; no server sits idle while the other has a queue.");
      else card("q-pool","Pooling test","Needs λ below 2μ","With these rates even two servers can't keep up. Lower λ or raise μ to compare separate lines with a shared line.")}
    [il,im,is].forEach(function(i){i.addEventListener("input",draw)});draw();
  })();

  // 5. Line balancing
  (function(){
    var T=[["A",10,[]],["B",11,["A"]],["C",5,["B"]],["D",4,["B"]],["E",12,["A"]],["F",3,["C","D"]],["G",7,["F"]],["H",11,["E"]],["I",3,["G","H"]]];
    var by={};T.forEach(function(t){by[t[0]]=t});
    function follow(n){var out={};(function rec(x){T.forEach(function(t){if(t[2].indexOf(x)>=0&&!out[t[0]]){out[t[0]]=1;rec(t[0])}})})(n);return Object.keys(out)}
    var RU=[["Longest task time",function(t){return t[1]}],["Most following tasks",function(t){return follow(t[0]).length}],["Ranked positional weight",function(t){return t[1]+follow(t[0]).reduce(function(a,f){return a+by[f][1]},0)}],["Shortest task time",function(t){return -t[1]}]];
    var rule=0,cin=document.getElementById("lb-c"),total=T.reduce(function(a,t){return a+t[1]},0);
    var pg=document.getElementById("pg-chart"),POS={A:[50,95],B:[160,50],E:[160,140],C:[280,22],D:[280,82],H:[280,150],F:[390,52],G:[500,52],I:[620,100]};
    arrowDef(pg,"ap","var(--muted)");
    T.forEach(function(t){t[2].forEach(function(p){var a=POS[p],b=POS[t[0]],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.sqrt(dx*dx+dy*dy);el("line",{x1:a[0]+dx/d*20,y1:a[1]+dy/d*20,x2:b[0]-dx/d*22,y2:b[1]-dy/d*22,stroke:"var(--muted)","stroke-width":1.5,"marker-end":"url(#ap)"},pg)})});
    var pgn={};T.forEach(function(t){var p=POS[t[0]],g=el("g",{},pg);pgn[t[0]]=el("circle",{cx:p[0],cy:p[1],r:18,fill:"var(--paper)",stroke:"var(--accent)","stroke-width":2},g);txt(g,p[0],p[1]+5,t[0],{anchor:"middle",size:14,weight:700,fill:"var(--ink)",disp:true});txt(g,p[0],p[1]+33,t[1]+"",{anchor:"middle",size:11,mono:true})});
    txt(pg,10,202,"Circle = task, number below = task time, arrow = must finish first. Colours match the stations below.",{size:11});
    function solve(C){var done={},st=[],key=RU[rule][1];while(Object.keys(done).length<T.length){var cur={tasks:[],t:0};
        while(true){var cand=T.filter(function(t){return !done[t[0]]&&t[2].every(function(p){return done[p]})&&t[1]<=C-cur.t});if(!cand.length)break;
          cand.sort(function(a,b){return key(b)-key(a)||(a[0]<b[0]?-1:1)});var pick=cand[0];done[pick[0]]=1;cur.tasks.push(pick);cur.t+=pick[1]}
        if(!cur.tasks.length)break;st.push(cur)}return st}
    var SC=["var(--accent)","var(--good)","var(--signal)","var(--c3)","var(--bad)","var(--l1)","var(--muted)","var(--accent)","var(--good)","var(--signal)"];
    var s=document.getElementById("lb-chart");
    function draw(){var C=+cin.value;document.getElementById("lb-c-out").textContent=C;var st=solve(C);
      clear(s);var L=90,R=640,top=20,bh=22,gap=6,H=top+st.length*(bh+gap)+34;s.setAttribute("viewBox","0 0 680 "+Math.max(H,120));var X=function(v){return L+(R-L)*v/C};
      st.forEach(function(x,i){var y=top+i*(bh+gap),cx=L;txt(s,L-8,y+bh/2+4,"Station "+(i+1),{anchor:"end",size:12,fill:"var(--ink)"});
        el("rect",{x:L,y:y,width:R-L,height:bh,rx:4,fill:"var(--bg)"},s);
        x.tasks.forEach(function(t){var w=X(t[1])-L;el("rect",{x:cx,y:y,width:Math.max(w-1.5,1),height:bh,rx:4,fill:SC[i%SC.length]},s);txt(s,cx+w/2,y+bh/2+4.5,t[0]+" "+t[1],{anchor:"middle",size:11.5,weight:700,fill:"var(--paper)"});cx+=w;pgn[t[0]].setAttribute("stroke",SC[i%SC.length]);pgn[t[0]].setAttribute("stroke-width",4)});
        if(C-x.t>0)txt(s,cx+6,y+bh/2+4,"idle "+(C-x.t),{size:11,fill:"var(--muted)"})});
      el("line",{x1:R,y1:top-8,x2:R,y2:top+st.length*(bh+gap),stroke:"var(--bad)","stroke-width":2,"stroke-dasharray":"5 4"},s);txt(s,R,top-10+ -0,"cycle time "+C,{anchor:"end",size:11.5,weight:700,fill:"var(--bad)"});
      var n=st.length,eff=total/(n*C),mn=Math.ceil(total/C);
      tiles("lb-sum",[[n+"","stations used"],[mn+"","theoretical minimum (66 ÷ "+C+", rounded up)",n>mn?"var(--signal)":"var(--good)"],[Math.round(eff*100)+"%","efficiency"],[Math.round((1-eff)*100)+"%","balance delay (idle share)"],[(n*C-total)+"","idle time per cycle"],[f1(60/C),"units per hour if times are in minutes"]])}
    chipset(document.getElementById("lb-rules"),RU.map(function(r){return r[0]}),0,function(i){rule=i;draw()});
    cin.addEventListener("input",draw);draw();
  })();

  // 6. Service variability (Frei)
  (function(){
    var V=[["Arrival","Customers don't come when you want them","Trauma comes in bursts: weekend nights, multi-vehicle crashes.","Keep surge staff on call; flexible bays that switch between uses.","Pre-alerts from paramedics; regional diversion when one centre is full."],
      ["Request","Customers want different things","A fall in an older patient vs a gunshot wound need different teams.","Broad-skilled trauma team that handles any case.","Tiered trauma activation: full team only for the most severe calls."],
      ["Capability","Customers differ in what they can do for themselves","Some patients can't give a history at all.","Staff ask, examine and test instead of relying on the patient.","Standard checklists and handover formats from paramedics."],
      ["Effort","Customers differ in how much effort they put in","Families may or may not bring medication lists.","Pharmacy and records staff fill the gaps.","Shared electronic records so the information is already there."],
      ["Subjective preference","Customers judge service differently","Families want updates at different frequencies.","A named family liaison who adapts to each family.","Fixed update times and a standard briefing script."]];
    var mode=0,box=document.getElementById("sv-grid");
    function draw(){box.innerHTML="";V.forEach(function(v){var d=document.createElement("div");d.className="vc";var h=document.createElement("b");h.textContent=v[0];d.appendChild(h);
      var p=document.createElement("small");p.textContent=v[1];d.appendChild(p);var e=document.createElement("p");e.textContent=v[2];d.appendChild(e);
      var a=document.createElement("p");a.className="strat "+(mode?"rd":"ac");a.textContent=(mode?"Reduce: ":"Accommodate: ")+v[mode?4:3];d.appendChild(a);box.appendChild(d)})}
    chipset(document.getElementById("sv-mode"),["Accommodate it","Reduce it"],0,function(i){mode=i;draw()});draw();
  })();

  // 7. Redesign levers
  (function(){
    var C=["Wait","Capacity","Variability","Errors"];
    var LV=[["Eliminate","Remove steps that add no value",[2,0,0,1],"Drop repeated assessments; the team takes the paramedic handover once, all together."],
      ["Run in parallel","Do steps at the same time instead of one after another",[2,1,0,0],"Draw blood and do bedside imaging during the primary survey instead of after it."],
      ["Protect the bottleneck","Never let it sit idle; move work off it",[2,2,0,0],"A technician preps the next patient so the CT scanner is never empty between scans."],
      ["Add capacity at the bottleneck","Only there; anywhere else changes nothing",[2,2,0,0],"A second scanner beside the trauma bay, or an operating room held open for trauma."],
      ["Pool resources","One shared queue for several servers",[2,1,1,0],"One trauma team covers two bays instead of one team fixed to each bay."],
      ["Segment the flow","Separate fast, simple cases from slow, complex ones",[2,1,2,0],"Tiered activation: minor injuries go to a fast track, major ones get the full team."],
      ["Move information ahead","Let data arrive before the patient",[1,0,2,1],"Paramedic pre-alert so the team, blood and scanner are ready on arrival."],
      ["Standardize","Same steps and formats every time",[1,0,2,2],"Trauma checklists and a fixed handover format cut omissions."]];
    var tb=document.getElementById("lv-table"),t=document.createElement("table"),th=document.createElement("thead"),hr=document.createElement("tr");
    ["Lever"].concat(C).forEach(function(c,i){var h=document.createElement("th");h.textContent=c;if(i)h.className="c";hr.appendChild(h)});th.appendChild(hr);t.appendChild(th);
    var body=document.createElement("tbody"),trs=[];
    LV.forEach(function(l,i){var tr=document.createElement("tr");tr.tabIndex=0;tr.setAttribute("role","button");var td=document.createElement("td");var b=document.createElement("b");b.textContent=l[0];var sm=document.createElement("small");sm.textContent=l[1];td.appendChild(b);td.appendChild(sm);tr.appendChild(td);
      l[2].forEach(function(v){var c=document.createElement("td");c.className="c";var dot=document.createElement("span");dot.className="eff e"+v;dot.setAttribute("aria-label",v===2?"strong effect":v===1?"some effect":"little effect");c.appendChild(dot);tr.appendChild(c)});
      function go(){trs.forEach(function(x,j){x.classList.toggle("on",j===i)});card("lv-card",l[0],l[1],l[3])}
      tr.addEventListener("click",go);tr.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}});body.appendChild(tr);trs.push(tr)});
    t.appendChild(body);tb.appendChild(t);trs[0].click();
    var cap=document.createElement("p");cap.className="cap";cap.textContent="Filled circle = strong effect, half circle = some effect. My reading of what each lever mainly changes.";tb.appendChild(cap);
  })();

  // 8. GVC governance
  (function(){
    var s=document.getElementById("gv-chart");
    var G=[["Market","Simple product, price does the coordinating. Buyers can switch suppliers easily.","Buying standard gloves or saline at the lowest price."],
      ["Modular","Complex product, but the supplier follows codified specifications and can serve many buyers.","Outsourced lab testing to a defined standard."],
      ["Relational","Complex, tacit information exchanged through trust and close ties; mutual dependence.","A hospital and the regional paramedic service co-designing the trauma pre-alert protocol."],
      ["Captive","Small suppliers depend on a dominant buyer that sets terms and monitors closely.","A small transport firm working only for one health authority."],
      ["Hierarchy","Done in-house; the lead firm controls it directly.","The hospital runs its own imaging and operating rooms."]];
    var sel=2,L=40,R=640,W=(R-L)/5;
    function draw(){clear(s);arrowDef(s,"ag","var(--muted)");
      el("line",{x1:L,y1:44,x2:R,y2:44,stroke:"var(--muted)","stroke-width":1.5,"marker-end":"url(#ag)"},s);
      txt(s,L,30,"Low",{size:11.5,mono:true});txt(s,R,30,"High",{anchor:"end",size:11.5,mono:true});
      txt(s,340,30,"explicit coordination and power asymmetry",{anchor:"middle",size:12,weight:700,fill:"var(--accent)"});
      G.forEach(function(g,i){var x=L+i*W+6,h=50+i*24,y=200-h,on=i===sel,gg=el("g",{},s);
        el("rect",{x:x,y:y,width:W-12,height:h,rx:6,fill:on?"var(--accent)":"var(--accent-soft)",stroke:"var(--accent)","stroke-width":on?2.5:1},gg);
        txt(gg,x+(W-12)/2,214,g[0],{anchor:"middle",size:13,weight:700,fill:on?"var(--accent)":"var(--ink)"});
        hit(gg,g[0],function(){sel=i;draw()})});
      card("gv-card",G[sel][0],"Hospital example: "+G[sel][2],G[sel][1])}
    draw();
  })();

  // 9. Process model families
  (function(){
    var M=[["Flowchart / swimlane","Activities, decisions and handoffs in sequence",[0]],["IDEF0","Each activity's inputs, controls, outputs and mechanisms, in nested levels",[0,1]],["Design structure matrix (DSM)","Who needs information from whom; shows rework loops and iteration",[1]],["PERT / Gantt / critical path","Durations, dependencies and the critical path",[2]],["Queueing models","Waits and utilization under random demand",[3]],["Discrete-event simulation","Flow over time with variability, resources and rules",[3,2]],["System dynamics","Feedback loops and stocks over longer periods",[3]]];
    var Q=["Where do handoffs happen?","Where does rework loop?","How long will it take?","What happens when demand varies?"];
    var box=document.getElementById("md-grid"),q=0;
    function draw(){box.innerHTML="";M.forEach(function(m){var d=document.createElement("div");d.className="mc"+(m[2].indexOf(q)>=0?" on":"");var b=document.createElement("b");b.textContent=m[0];var p=document.createElement("small");p.textContent=m[1];d.appendChild(b);d.appendChild(p);box.appendChild(d)})}
    chipset(document.getElementById("md-chips"),Q,0,function(i){q=i;draw()});draw();
  })();

  // 10. Case order of attack
  (function(){
    var S=[["Map","Draw the current state as a swimlane map: steps, decisions, waits, handoffs. Use the case's own steps (step 2)."],["Measure","Put times and resources into the bottleneck table (step 3). Note arrival rates and their peaks."],["Diagnose","Find the bottleneck, the longest waits and the main sources of variability (steps 4 and 6)."],["Redesign","Pick levers (step 7). Check the new bottleneck and the new waits with the same tools."],["Judge","Compare patient outcome, experience, cost and staff load. Name the trade-off you accept."]];
    var box=document.getElementById("t5");
    S.forEach(function(x,i){var b=document.createElement("button");b.type="button";b.innerHTML="<i>"+(i+1)+"</i>";b.appendChild(document.createTextNode(x[0]));b.addEventListener("click",function(){go(i)});box.appendChild(b)});
    function go(i){[].forEach.call(box.children,function(b,j){b.classList.toggle("on",j===i);b.setAttribute("aria-pressed",j===i)});card("t5-card",(i+1)+". "+S[i][0],"",S[i][1])}
    go(0);
  })();

