// Shared helpers for class notes pages. Loaded before the page's own app.js.
  var NS="http://www.w3.org/2000/svg";
  function el(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
  function txt(p,x,y,s,o){o=o||{};var t=el("text",{x:x,y:y,"text-anchor":o.anchor||"start",fill:o.fill||"var(--muted)","font-size":o.size||12,"font-family":o.mono?"var(--mono)":(o.disp?"var(--display)":"var(--body)"),"font-weight":o.weight||400},p);t.textContent=s;return t}
  function lines(p,x,y,arr,o){o=o||{};arr.forEach(function(s,i){txt(p,x,y+i*(o.lh||15),s,o)})}
  function clear(svg){while(svg.firstChild)svg.removeChild(svg.firstChild)}
  function fmt(v){return v.toLocaleString()}
  function arrowDef(svg,id,color){var d=el("defs",{},svg);var m=el("marker",{id:id,viewBox:"0 0 10 10",refX:9,refY:5,markerWidth:7,markerHeight:7,orient:"auto-start-reverse"},d);el("path",{d:"M0,0 L10,5 L0,10 z",fill:color},m)}
  function card(id,title,who,body){var c=document.getElementById(id);c.innerHTML="";var b=document.createElement("b");b.textContent=title;c.appendChild(b);if(who){var w=document.createElement("span");w.className="who";w.textContent=who;c.appendChild(w)}var p=document.createElement("p");p.textContent=body;c.appendChild(p)}
  function hit(g,label,fn){g.setAttribute("class","hit");g.setAttribute("tabindex","0");g.setAttribute("role","button");g.setAttribute("aria-label",label);g.addEventListener("click",fn);g.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();fn()}})}
  function ls(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
  function lsw(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function chipset(box,labels,on,fn){box.innerHTML="";labels.forEach(function(l,i){var b=document.createElement("button");b.type="button";b.textContent=l;b.addEventListener("click",function(){fn(i);paint(i)});box.appendChild(b)});
    function paint(k){[].forEach.call(box.children,function(b,i){b.classList.toggle("on",i===k);b.setAttribute("aria-pressed",i===k)})}paint(on);return paint}
  function tiles(id,arr){var box=document.getElementById(id);box.innerHTML="";arr.forEach(function(q){var d=document.createElement("div"),b=document.createElement("b"),sp=document.createElement("span");b.textContent=q[0];sp.textContent=q[1];if(q[2])b.style.color=q[2];d.appendChild(b);d.appendChild(sp);box.appendChild(d)})}
  function f1(x){return (Math.round(x*10)/10).toString()}
  function f2(x){return (Math.round(x*100)/100).toString()}

