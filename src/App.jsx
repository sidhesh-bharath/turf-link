import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [user, setUser] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState("");
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [authStep, setAuthStep] = useState("input");

  const initApp = useCallback(async (isInitial = false) => {
    if(isInitial) setLoading(true);
    const { data: settings } = await supabase.from('squad_settings').select('*').single();
    const { data: playersList } = await supabase.from('squad_players').select('*').order('created_at');
    if (settings) setGameData(settings);
    if (playersList) setPlayers(playersList);
    setLoading(false);
  }, []);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        initApp(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') initApp(false);
    });
    return () => subscription.unsubscribe();
  }, [initApp]);

  const handleEmailAuth = async (type) => {
    if (type === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return alert(error.message);
      setAuthStep("verify");
      alert("VERIFICATION_LINK_SENT_TO_EMAIL");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const verifyOTP = async () => {
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
    if (error) alert(error.message);
  };

  const handleAddPlayer = async (e, isManualEntry = false) => {
    if(e) e.preventDefault();
    if(!newName.trim() || !user) return;
    if (!isManualEntry && players.find(p => p.user_id === user?.id)) return alert("ALREADY_IN_ROSTER");
    const { data } = await supabase.from('squad_players').insert([{ 
        name: newName.toUpperCase(), 
        user_id: isManualEntry ? null : user.id, 
        payment_status: 'pending' 
    }]).select();
    if(data) setPlayers([...players, data[0]]);
    setNewName("");
  };

  const updateStatus = async (player, newStatus) => {
    setPlayers(players.map(p => p.id === player.id ? { ...p, payment_status: newStatus } : p));
    await supabase.from('squad_players').update({ payment_status: newStatus }).eq('id', player.id);
  };

  const claimAccount = async (player) => {
    if (!user || players.find(p => p.user_id === user?.id)) return alert("YOU_ALREADY_HAVE_A_SLOT");
    const { data } = await supabase.from('squad_players').update({ user_id: user.id }).eq('id', player.id).select();
    if (data) setPlayers(players.map(p => p.id === player.id ? { ...p, user_id: user.id } : p));
  };

  const handleSystemShare = async () => {
    const shareData = {
      title: `SQUAD_LINKS: ${gameData.turf_name}`,
      text: `SQUAD_LINKS: ${gameData.turf_name}\nVENUE: ${gameData.location}\nTIME: ${gameData.time}\n\nJoin the squad here:`,
      url: window.location.href,
    };
    try {
      if (navigator.share) { await navigator.share(shareData); } 
      else { await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`); alert("LINK_COPIED"); }
    } catch (err) { console.log(err); }
  };

  const isHost = user && gameData && user.id === gameData.host_id;
  const myEntry = user ? players.find(p => p.user_id === user.id) : null;
  const costPerPerson = gameData?.use_manual_split ? gameData.manual_price : (gameData ? Math.round(gameData.turf_price / (players.length || 1)) : 0);
  const upiUrl = `upi://pay?pa=${gameData?.pay_to_number}&pn=TURF&am=${costPerPerson}&cu=INR&tn=TURF`;
  const verifiedCount = players.filter(p => p.payment_status === 'verified').length;
  const totalCollected = verifiedCount * costPerPerson;
  const targetTotal = gameData?.use_manual_split ? (players.length * gameData.manual_price) : gameData?.turf_price;

  if (!user && !loading) return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '400px', margin: '100px auto 0 auto', padding: '0 20px' }}>
        <div style={{...cardStyle, padding: '40px 20px', border: '2px solid #fff'}}>
          <h1 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '10px' }}>SQUAD_LINKS</h1>
          <p style={{...labelStyle, textAlign: 'center', marginBottom: '30px', color: '#888'}}>V1.0_CORE_SYSTEM_ACCESS</p>
          {!showEmailAuth ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} style={payBtn}>CONTINUE_WITH_GOOGLE</button>
              <button onClick={() => setShowEmailAuth(true)} style={{...miniBtn, padding: '15px', fontSize: '12px'}}>INTERNAL_AUTH_LOGIN</button>
            </div>
          ) : authStep === "input" ? (
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <div style={inputGroup}><span style={inputLabel}>UID:</span><input style={inputStyle} placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div style={inputGroup}><span style={inputLabel}>KEY:</span><input style={inputStyle} type="password" placeholder="PASSWORD" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => handleEmailAuth('login')} style={{...payBtn, flex:1, fontSize: '11px'}}>LOGIN</button>
                <button onClick={() => handleEmailAuth('signup')} style={{...payBtn, flex:1, backgroundColor:'#222', color:'#fff', border: '1px solid #444', fontSize: '11px'}}>SIGNUP</button>
              </div>
              <button onClick={() => setShowEmailAuth(false)} style={{...miniBtn, border: 'none', color: '#666'}}>[ BACK ]</button>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <p style={{fontSize:'10px', color:'#FFD700'}}>⚠️ CHECK_EMAIL_FOR_VERIFICATION_CODE</p>
              <div style={inputGroup}><span style={inputLabel}>OTP:</span><input style={inputStyle} placeholder="6-DIGIT_CODE" value={otp} onChange={e => setOtp(e.target.value)} /></div>
              <button onClick={verifyOTP} style={payBtn}>VERIFY_&_ENTER</button>
              <button onClick={() => setAuthStep("input")} style={{...miniBtn, border: 'none', color: '#666'}}>[ WRONG_EMAIL?_GO_BACK ]</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading || !gameData) return <div style={containerStyle}>BOOTING_SYSTEM...</div>;

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <div style={headerStyle}>
          <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>SQUAD_LINKS</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            {isHost && <button onClick={() => setIsEditingGame(!isEditingGame)} style={miniBtn}>{isEditingGame ? '[CLOSE]' : '[EDIT]'}</button>}
            <button onClick={() => supabase.auth.signOut()} style={miniBtn}>[LOGOUT]</button>
          </div>
        </div>

        {isEditingGame ? (
          <div style={cardStyle}>
            <h3 style={labelStyle}>HOST_SETTINGS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={inputGroup}><span style={inputLabel}>TURF:</span><input style={inputStyle} value={gameData.turf_name} onChange={e => setGameData({...gameData, turf_name: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>VENUE:</span><input style={inputStyle} value={gameData.location} onChange={e => setGameData({...gameData, location: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>MAP:</span><input style={inputStyle} value={gameData.map_link} onChange={e => setGameData({...gameData, map_link: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>TIME:</span><input style={inputStyle} value={gameData.time} onChange={e => setGameData({...gameData, time: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>TOTAL:</span><input style={inputStyle} type="number" value={gameData.turf_price} onChange={e => setGameData({...gameData, turf_price: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>UPI:</span><input style={inputStyle} value={gameData.pay_to_number} onChange={e => setGameData({...gameData, pay_to_number: e.target.value})} /></div>
              <div style={{display:'flex', gap:'10px', alignItems:'center', padding: '10px 0', justifyContent: 'flex-start'}}><span style={{...labelStyle, marginBottom: 0}}>MANUAL_SPLIT:</span><input type="checkbox" checked={gameData.use_manual_split} onChange={e => setGameData({...gameData, use_manual_split: e.target.checked})} style={{width:'16px', height:'16px', cursor:'pointer'}} /></div>
              {gameData.use_manual_split && <div style={inputGroup}><span style={inputLabel}>PRICE:</span><input style={inputStyle} type="number" value={gameData.manual_price} onChange={e => setGameData({...gameData, manual_price: e.target.value})} /></div>}
              <button onClick={() => supabase.from('squad_settings').update(gameData).eq('id', 1).then(() => setIsEditingGame(false))} style={payBtn}>SAVE_CHANGES</button>
              <button onClick={async () => { if(confirm("WIPE_ROSTER?")) { await supabase.from('squad_players').delete().neq('id', 0); initApp(); setIsEditingGame(false); } }} style={{...miniBtn, marginTop:'20px', color:'#ff4444', borderColor:'#ff4444', padding:'10px'}}>RESET_ALL_PLAYERS</button>
            </div>
          </div>
        ) : (
          <div style={cardStyle}>
            <div style={{ borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '22px', margin: '0' }}>{gameData.turf_name}</h2>
                <p style={{ fontSize: '11px', color: '#666', margin: '5px 0' }}>{gameData.location} // {gameData.time}</p>
                <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
                  <button onClick={() => { if(gameData.map_link) { navigator.clipboard.writeText(gameData.map_link); alert("COPIED"); } }} style={{...miniBtn, flex:1}}>COPY_MAP</button>
                  <button onClick={handleSystemShare} style={{...miniBtn, flex:1}}>SHARE_SQUAD</button>
                </div>
            </div>
            {myEntry ? (
                myEntry.payment_status === 'pending' ? (
                  !showPaymentModal ? <button onClick={() => setShowPaymentModal(true)} style={payBtn}>PAY_SHARE (₹{costPerPerson})</button> :
                  <div style={{ background: '#1a1a1a', padding: '15px', border: '1px solid #333' }}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}><span style={labelStyle}>UPI_PAYMENT</span><button onClick={() => setShowPaymentModal(false)} style={miniBtn}>X</button></div>
                      <div style={{display:'flex', justifyContent:'center', padding:'10px', background:'#fff', marginBottom:'15px'}}><QRCodeSVG value={upiUrl} size={150} /></div>
                      {isMobile && <button onClick={() => window.location.href = upiUrl} style={payBtn}>OPEN_UPI_APP</button>}
                  </div>
                ) : <button disabled style={{...payBtn, backgroundColor: '#222', color: '#fff', opacity:0.5, cursor: 'not-allowed'}}>PAYMENT_SUBMITTED</button>
            ) : <p style={{...labelStyle, textAlign:'center'}}>JOIN_PLAYERS_TO_PAY</p>}
          </div>
        )}

        <form onSubmit={(e) => handleAddPlayer(e, false)} style={{ display: 'flex', margin: '20px 0', gap: '5px' }}>
          <input style={{...inputStyle, flex: 1, backgroundColor: '#1a1a1a', border: '1px solid #333', padding: '12px'}} placeholder="ENTER_NAME" value={newName} onChange={e => setNewName(e.target.value)} />
          <button type="submit" style={{backgroundColor:'#fff', color:'#000', fontWeight:'800', border:'none', padding:'0 20px', fontSize: '10px'}}>JOIN</button>
          {isHost && <button type="button" onClick={() => handleAddPlayer(null, true)} style={{...miniBtn, padding:'0 15px'}}>+ENTRY</button>}
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={labelStyle}>// PLAYERS ({players.length})</h3>
            {players.map(p => {
                const isMe = user?.id === p.user_id;
                const isEntryAdmin = p.user_id === gameData.host_id;
                const isManualEntry = p.user_id === null;
                let btnColor = '#444'; let btnText = 'MARK PAID';
                if (p.payment_status === 'review') { btnColor = '#FFD700'; btnText = isHost ? 'APPROVE?' : 'WAITING'; }
                else if (p.payment_status === 'verified') { btnColor = '#00FF41'; btnText = 'VERIFIED'; }
                return (
                    <div key={p.id} style={{...playerRow, backgroundColor: isMe ? '#111' : 'transparent'}}>
                        <span style={{color: isMe ? '#0088ff' : '#fff'}}>{isEntryAdmin && '👑 '}{p.name} {isMe && '(YOU)'} {isManualEntry && '(M)'}</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                             {isManualEntry && !myEntry && <button onClick={() => claimAccount(p)} style={{...miniBtn, color:'#0088ff', borderColor:'#0088ff'}}>CLAIM</button>}
                             <button 
                                onClick={() => {
                                    if(p.payment_status === 'verified' && isHost) updateStatus(p, 'pending');
                                    else if(p.payment_status === 'review' && isHost) updateStatus(p, 'verified');
                                    else if(p.payment_status === 'review' && isMe) updateStatus(p, 'pending');
                                    else if(p.payment_status === 'pending' && (isMe || (isHost && isManualEntry))) updateStatus(p, 'review');
                                }}
                                disabled={(!isMe && !isHost && !(isManualEntry && !myEntry)) || (p.payment_status === 'verified' && !isHost)}
                                style={{ ...miniBtn, borderColor: btnColor, color: btnColor, minWidth: '85px' }}
                            >{btnText}</button>
                            {isHost && <button onClick={() => supabase.from('squad_players').delete().eq('id', p.id).then(() => initApp())} style={{ color: '#ff4444', border: 'none', background: 'none' }}>[X]</button>}
                        </div>
                    </div>
                );
            })}
        </div>
        <div style={{marginTop:'30px', padding:'15px', borderTop:'1px solid #333', textAlign:'center'}}>
           <span style={{...labelStyle, margin:0, textAlign:'center'}}>TOTAL_COLLECTED: ₹{totalCollected} / ₹{targetTotal}</span>
        </div>
      </div>
    </div>
  );
}

const containerStyle = { fontFamily: "'JetBrains Mono', monospace", backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '20px', textTransform: 'uppercase' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '30px' };
const cardStyle = { border: '1px solid #fff', padding: '20px', backgroundColor: '#111', textAlign: 'center', marginBottom: '20px' };
const inputGroup = { display: 'flex', alignItems: 'center', backgroundColor: '#1a1a1a', border: '1px solid #333', padding: '0 12px', marginBottom: '10px' };
const inputLabel = { fontSize: '10px', color: '#666', fontWeight: '800', marginRight: '10px' };
const inputStyle = { flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '12px 0', outline: 'none', fontFamily: "'JetBrains Mono', monospace" };
const payBtn = { backgroundColor: '#fff', color: '#000', border: 'none', fontWeight: '800', cursor: 'pointer', padding: '15px', width: '100%', fontSize: '14px' };
const playerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #222', fontSize: '13px' };
const labelStyle = { fontSize: '10px', color: '#666', fontWeight: '800', marginBottom: '10px', display: 'block', textAlign: 'left' };
const miniBtn = { background: 'none', border: '1px solid #444', color: '#fff', fontSize: '10px', cursor: 'pointer', padding: '5px 10px' };
