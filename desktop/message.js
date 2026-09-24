window.pacificaMessage.onMessage(state=>{
 document.getElementById('name').textContent=state.name||'New message';
 document.getElementById('body').textContent=state.body||'Open Pacifica to read the message.';
 document.body.classList.toggle('dark',state.theme==='dark');
});
document.getElementById('open').onclick=()=>window.pacificaMessage.action('open');
document.getElementById('dismiss').onclick=()=>window.pacificaMessage.action('dismiss');
