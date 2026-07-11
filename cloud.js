(function(){
  const PROJECT_URL='https://akmemppfsduurblwvoqu.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_6xcpoagFCfyjOVLhOyGqjA_jbN4fno1';
  const button=document.querySelector('#accountButton'),dialog=document.querySelector('#authDialog'),form=document.querySelector('#authForm'),message=document.querySelector('#authMessage');
  if(!window.supabase){button.textContent='Только локально';button.title='Нет подключения к сервису синхронизации';return}
  const client=window.supabase.createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  let user=null,timer=null,syncing=false;
  const payload=()=>({version:2,entries,history});
  function status(text){button.textContent=text;button.title=user?.email||text}
  async function push(){if(!user||syncing)return;syncing=true;status('Сохранение…');const {error}=await client.from('health_data').upsert({user_id:user.id,payload:payload(),updated_at:new Date().toISOString()},{onConflict:'user_id'});syncing=false;error?status('Ошибка синхронизации'):status('✓ Синхронизировано')}
  function scheduleSync(){if(!user)return;clearTimeout(timer);timer=setTimeout(push,700)}
  async function load(){status('Синхронизация…');const {data,error}=await client.from('health_data').select('payload').eq('user_id',user.id).maybeSingle();if(error){status('Ошибка базы');message.textContent='Сначала выполните файл supabase-schema.sql в SQL Editor.';return}if(data?.payload){entries=Array.isArray(data.payload.entries)?data.payload.entries:entries;history=Array.isArray(data.payload.history)?normalizeHistory(data.payload.history):history;localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));localStorage.setItem(HISTORY_KEY,JSON.stringify(history));renderAll()}else await push();status('✓ Синхронизировано')}
  async function applySession(session){user=session?.user||null;if(user){status(user.email);dialog.close();await load()}else status('Войти')}
  button.onclick=async()=>{if(user){if(confirm(`Выполнен вход: ${user.email}\n\nВыйти из аккаунта?`))await client.auth.signOut()}else{message.textContent='';dialog.showModal()}};
  document.querySelectorAll('[data-auth-close]').forEach(x=>x.onclick=()=>dialog.close());
  document.querySelector('#forgotPassword').onclick=async()=>{const email=form.elements.email.value.trim();message.className='auth-message';if(!email){message.textContent='Сначала укажите email.';form.elements.email.focus();return}message.textContent='Отправляем письмо…';const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error){message.textContent=error.message;return}message.className='auth-message success';message.textContent='Письмо для смены пароля отправлено. Проверьте почту.'};
  form.onsubmit=async e=>{e.preventDefault();message.textContent='Подождите…';const fd=new FormData(form),email=fd.get('email'),password=fd.get('password'),action=e.submitter?.value;const result=action==='signup'?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});if(result.error){message.textContent=result.error.message;return}message.textContent=action==='signup'&&!result.data.session?'Проверьте email и подтвердите регистрацию.':'';if(result.data.session)await applySession(result.data.session)};
  client.auth.onAuthStateChange((event,session)=>{setTimeout(async()=>{if(event==='PASSWORD_RECOVERY'){const next=prompt('Придумайте новый пароль (минимум 8 символов):');if(next&&next.length>=8){const {error}=await client.auth.updateUser({password:next});alert(error?error.message:'Пароль изменён. Теперь можно войти с новым паролем.')}else if(next)alert('Пароль должен содержать минимум 8 символов.')}await applySession(session)},0)});
  client.auth.getSession().then(({data})=>applySession(data.session));
  window.healthCloud={scheduleSync,push};
})();


