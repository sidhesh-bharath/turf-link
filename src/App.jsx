import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const GlobalStyles = () => (
  <style>{`
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    
    ::-webkit-scrollbar { width: 0px; background: transparent; }
    body, html { 
      margin: 0; padding: 0; overflow: hidden; 
      background-color: #000; height: 100%;
      overscroll-behavior: none; font-family: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    
    .boot-screen {
      background: #000; height: 100vh; display: flex;
      flex-direction: column; justify-content: center;
      align-items: center; color: #fff; font-size: 10px;
      letter-spacing: 2px;
    }
    .cursor { display: inline-block; width: 6px; height: 12px; background: #fff; margin-left: 5px; animation: blink 0.8s infinite; }
    .loader-bar { width: 140px; height: 2px; background: #111; margin-top: 15px; position: relative; overflow: hidden; }
    .loader-progress { 
        position: absolute; height: 100%; background: #fff; width: 0%; 
        transition: width 2s cubic-bezier(0.4, 0, 0.2, 1); 
    }
  `}</style>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState("");
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bootText, setBootText] = useState("SYSTEM.BOOTING_SQUAD");
  const [progress, setProgress] = useState(0);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  const initApp = useCallback(async (isInitial = false) => {
    const dataPromise = (async () => {
        const { data: settings } = await supabase.from('squad_settings').select('*').single();
        const { data: playersList } = await supabase.from('squad_players').select('*').order('created_at');
        return { settings, playersList };
    })();

    if(isInitial) {
        setLoading(true);
        setTimeout(() => setProgress(100), 50);
        setTimeout(() => setBootText("RUNNING.CHECKS"), 600);
        setTimeout(() => setBootText("AUTH.ESTABLISHED"), 1300);
        setTimeout(() => setBootText("LINK.READY"), 1900);

        const [results] = await Promise.all([
            dataPromise,
            new Promise(r => setTimeout(r, 2100))
        ]);

        if (results.settings) setGameData(results.settings);
        if (results.playersList) setPlayers(results.playersList);
        setLoading(false);
    } else {
        const results = await dataPromise;
        if (results.settings) setGameData(results.settings);
        if (results.playersList) setPlayers(results.playersList);
    }
  }, []);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      initApp(true);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') { setUser(session?.user ?? null); initApp(false); }
      if (event === 'SIGNED_OUT') { setUser(null); setPlayers([]); setIsEditingGame(false); }
    });
    return () => subscription.unsubscribe();
  }, [initApp]);

  const handleEmailAuth = async (type) => {
    if (type === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return alert(error.message);
      alert("VERIFICATION_SENT");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.replace(window.location.origin);
  };

  const transferHost = async (newHostId, newHostName) => {
    if (!window.confirm(`TRANSFER ADMIN PRIVILEGES TO ${newHostName.toUpperCase()}?`)) return;
    await supabase.from('squad_settings').update({ host_id: newHostId }).eq('id', 1);
    initApp();
  };

  const copyWhatsAppStatus = () => {
    const sorted = [...players].sort((a, b) => (a.user_id === gameData.host_id ? -1 : 1));
    const list = sorted.map((p, i) => `${i + 1}. ${p.name} ${p.payment_status === 'verified' ? '✅' : '⏳'}`).join('\n');
    const text = `⚽ *SQUAD_LIST: ${gameData.turf_name}*\n📅 ${gameData.time}\n\n${list}\n\n🔥 *${players.length}/${gameData.max_players || 14} SLOTS FILLED*\n🔗 Join: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    alert("WA_COPIED");
  };

  const handleAddPlayer = async (e, isManualEntry = false) => {
    if(e) e.preventDefault();
    if(!newName.trim() || !user) return;
    if (!isManualEntry && players.some(p => p.user_id === user.id)) return;
    if (players.length >= (gameData.max_players || 14)) return alert("SQUAD_FULL");
    const { data } = await supabase.from('squad_players').insert([{ 
        name: newName.toUpperCase(), user_id: isManualEntry ? null : user.id, payment_status: 'pending' 
    }]).select();
    if(data) { setPlayers([...players, data[0]]); setNewName(""); }
  };

  const updateStatus = async (player, newStatus) => {
    setPlayers(players.map(p => p.id === player.id ? { ...p, payment_status: newStatus } : p));
    await supabase.from('squad_players').update({ payment_status: newStatus }).eq('id', player.id);
  };

  const claimAccount = async (player) => {
    if (!user || players.some(p => p.user_id === user?.id)) return alert("ALREADY_IN_SQUAD");
    await supabase.from('squad_players').update({ user_id: user.id }).eq('id', player.id);
    initApp();
  };

  const isHost = user && gameData && user.id === gameData.host_id;
  const myEntry = user ? players.find(p => p.user_id === user.id) : null;
  const maxSlots = gameData?.max_players || 14;
  const occupancy = (players.length / maxSlots) * 100;
  const costPerPerson = gameData?.use_manual_split ? gameData.manual_price : (gameData ? Math.round(gameData.turf_price / (players.length || 1)) : 0);
  const upiUrl = `upi://pay?pa=${gameData?.pay_to_number}&pn=TURF&am=${costPerPerson}&cu=INR`;
  const targetTotal = gameData?.use_manual_split ? (players.length * (gameData.manual_price || 0)) : (gameData?.turf_price || 0);
  const currentTotal = players.filter(p => p.payment_status === 'verified').length * costPerPerson;

  const sortedPlayers = [...players].sort((a, b) => (a.user_id === gameData.host_id ? -1 : b.user_id === gameData.host_id ? 1 : 0));

  if (loading) return (
    <div className="boot-screen">
        <GlobalStyles />
        <div>{bootText}<span className="cursor"></span></div>
        <div className="loader-bar"><div className="loader-progress" style={{ width: `${progress}%` }}></div></div>
    </div>
  );

  if (!user) return (
    <div style={{...containerStyle, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <GlobalStyles />
        <div style={{...cardStyle, width: '100%', maxWidth: '350px', border: '1px solid #fff', padding: '30px'}}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '30px', textAlign: 'center' }}>SQUAD_LINKS</h1>
          {!showEmailAuth ? (
            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              <button onClick={() => supabase.auth.signInWithOAuth({provider:'google'})} style={payBtn}>GOOGLE_AUTH</button>
              <button onClick={() => setShowEmailAuth(true)} style={miniBtn}>EMAIL_LOGIN</button>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              <input style={inputStyle} placeholder="EMAIL" onChange={e => setEmail(e.target.value)} />
              <input style={inputStyle} type="password" placeholder="PASSWORD" onChange={e => setPassword(e.target.value)} />
              <button onClick={() => handleEmailAuth('login')} style={payBtn}>LOGIN</button>
              <button onClick={() => setShowEmailAuth(false)} style={{...miniBtn, border:'none'}}>BACK</button>
            </div>
          )}
        </div>
    </div>
  );

  return (
    <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <GlobalStyles />
      <div style={{ padding: '15px 15px 0 15px', backgroundColor: '#000', flexShrink: 0 }}>
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          <div style={headerStyle}>
            <h1 style={{ fontSize: '16px', fontWeight: '900' }}>SQUAD_LINKS</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              {isHost && <button onClick={() => setIsEditingGame(!isEditingGame)} style={miniBtn}>{isEditingGame ? 'CLOSE' : 'EDIT'}</button>}
              <button onClick={handleLogout} style={miniBtn}>LOGOUT</button>
            </div>
          </div>
          {!isEditingGame && (
            <div style={{...cardStyle, padding: '15px'}}>
              <h2 className="card-header" style={{ fontSize: '18px', margin: '0' }}>{gameData.turf_name}</h2>
              <p style={{ fontSize: '10px', color: '#888', margin: '4px 0 12px 0' }}>{gameData.location} // {gameData.time}</p>
              <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginBottom: '4px' }}>
                      <span>SQUAD: {players.length}/{maxSlots}</span>
                      <span>{occupancy >= 100 ? 'FULL' : 'OPEN'}</span>
                  </div>
                  <div style={{ height: '2px', background: '#222', width: '100%' }}><div style={{ height: '100%', width: `${Math.min(occupancy, 100)}%`, background: '#fff' }} /></div>
              </div>
              <div style={{display:'flex', gap:'5px', marginBottom: '15px'}}>
                  <button onClick={() => window.open(gameData.map_link)} style={{...miniBtn, flex:1, border: '1px solid #222'}}>MAPS</button>
                  {isHost && <button onClick={copyWhatsAppStatus} style={{...miniBtn, flex:1, border: '1px solid #fff'}}>WA_COPY</button>}
              </div>
              {myEntry && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {myEntry.payment_status === 'pending' ? (
                    !showPaymentModal ? (
                      <button onClick={() => setShowPaymentModal(true)} style={payBtn}>PAY_SHARE: ₹{costPerPerson}</button>
                    ) : (
                      <div style={{ padding: '15px', border: '1px solid #333', background: '#000', width: '100%' }}>
                          <div style={{display:'flex', justifyContent:'center', padding:'10px', background:'#fff', marginBottom:'15px'}}><QRCodeSVG value={upiUrl} size={150} /></div>
                          {isMobile && <button onClick={() => window.location.href = upiUrl} style={payBtn}>OPEN_UPI_APP</button>}
                          <button onClick={() => setShowPaymentModal(false)} style={{...miniBtn, border:'none', marginTop:'10px'}}>CLOSE</button>
                      </div>
                    )
                  ) : (
                    <button disabled style={payedBtnStyle}>PAYMENT_COMPLETE</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '0 15px', backgroundColor: '#000' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', paddingBottom: '100px' }}>
          {isEditingGame && (
            <div style={{...cardStyle, marginBottom: '15px', padding: '15px'}}>
              <div style={inputGroup}><span style={inputLabel}>MAX:</span><input style={inputStyle} type="number" value={gameData.max_players} onChange={e => setGameData({...gameData, max_players: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>TURF:</span><input style={inputStyle} value={gameData.turf_name} onChange={e => setGameData({...gameData, turf_name: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>VENUE:</span><input style={inputStyle} value={gameData.location} onChange={e => setGameData({...gameData, location: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>MAPS:</span><input style={inputStyle} value={gameData.map_link} onChange={e => setGameData({...gameData, map_link: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>TIME:</span><input style={inputStyle} value={gameData.time} onChange={e => setGameData({...gameData, time: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>TOTAL:</span><input style={inputStyle} type="number" value={gameData.turf_price} onChange={e => setGameData({...gameData, turf_price: e.target.value})} /></div>
              <div style={inputGroup}><span style={inputLabel}>UPI:</span><input style={inputStyle} value={gameData.pay_to_number} onChange={e => setGameData({...gameData, pay_to_number: e.target.value})} /></div>
              <div style={{display:'flex', gap:'12px', alignItems:'center', padding:'10px 0', justifyContent:'flex-start'}}><span style={{...labelStyle, marginBottom:0}}>MANUAL_SPLIT:</span><input type="checkbox" checked={gameData.use_manual_split} onChange={e => setGameData({...gameData, use_manual_split: e.target.checked})} style={{width:'18px', height:'18px', cursor:'pointer'}} /></div>
              {gameData.use_manual_split && <div style={inputGroup}><span style={inputLabel}>PRICE:</span><input style={inputStyle} type="number" value={gameData.manual_price} onChange={e => setGameData({...gameData, manual_price: e.target.value})} /></div>}
              <button onClick={() => supabase.from('squad_settings').update(gameData).eq('id', 1).then(() => setIsEditingGame(false))} style={payBtn}>SAVE_CHANGES</button>
            </div>
          )}

          {(isHost || !myEntry) && (
            <form onSubmit={(e) => handleAddPlayer(e, false)} style={{ display: 'flex', marginBottom: '15px', gap: '5px' }}>
              <input style={{...inputStyle, flex: 1, backgroundColor: '#000', padding: '12px', border: '1px solid #222'}} placeholder="NAME" value={newName} onChange={e => setNewName(e.target.value)} />
              <button type="submit" disabled={!!myEntry || players.length >= maxSlots} style={{...payBtn, width: 'auto', padding: '0 20px', backgroundColor: (myEntry || players.length >= maxSlots) ? '#111' : '#fff', color: (myEntry || players.length >= maxSlots) ? '#555' : '#000', height: '44px'}}>JOIN</button>
              {isHost && <button type="button" onClick={() => handleAddPlayer(null, true)} style={{...miniBtn, height: '44px', border: '1px solid #222'}}>+EXTRA</button>}
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={labelStyle}>// PLAYERS ({players.length})</h3>
              {sortedPlayers.map(p => {
                  const isMe = user?.id === p.user_id;
                  const isPaid = p.payment_status === 'verified';
                  const isReview = p.payment_status === 'review';
                  
                  // LOGIC FIX: Admin (isHost) can change status for ANYONE. 
                  // Users (isMe) can change their own status to 'review' but not back.
                  const canToggle = isHost || (isMe && !isPaid);

                  return (
                      <div key={p.id} style={{...playerRow, borderBottom: isMe ? '1px solid #0088ff' : '1px solid #222'}}>
                          <span className="player-name" style={{color: isMe ? '#0088ff' : '#fff'}}>{(p.user_id === gameData.host_id) && '👑 '}{p.name} {isMe && '(YOU)'}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                               {isHost && !isMe && p.user_id && <button onClick={() => transferHost(p.user_id, p.name)} style={{...miniBtn, border: 'none', color: '#555', padding: '6px 4px'}}>PROMOTE</button>}
                               {!p.user_id && !myEntry && <button onClick={() => claimAccount(p)} style={{...miniBtn, color:'#0088ff', borderColor: '#0088ff', padding: '6px 8px'}}>CLAIM</button>}
                               <button onClick={() => {
                                      if(isPaid && isHost) updateStatus(p, 'pending');
                                      else if(isReview && isHost) updateStatus(p, 'verified');
                                      else if(!isPaid && (isMe || isHost)) updateStatus(p, 'review');
                                  }}
                                  disabled={!canToggle}
                                  style={{
                                    ...miniBtn, minWidth: '85px',
                                    backgroundColor: isPaid ? '#fff' : 'transparent',
                                    color: isPaid ? '#000' : '#fff',
                                    border: isReview ? '2px solid #fff' : isPaid ? '1px solid #fff' : '1px solid #222',
                                    padding: isReview ? '5px 10px' : '6px 11px',
                                    opacity: (!canToggle) ? 0.3 : 1
                                  }}
                              >{isPaid ? 'PAID' : isReview ? 'REVIEW' : 'UNPAID'}</button>
                              {isHost && <button onClick={() => supabase.from('squad_players').delete().eq('id', p.id).then(() => initApp())} style={{ color: '#555', border: 'none', background: 'none', padding: '0 5px' }}>×</button>}
                          </div>
                      </div>
                  );
              })}
          </div>
        </div>
      </div>

      <div style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, 
        backgroundColor: '#000', borderTop: '1px solid #222', 
        padding: '16px 15px', zIndex: 10, display: 'flex', 
        justifyContent: 'center', alignItems: 'center'
      }}>
        <span style={{...labelStyle, margin: 0, textAlign: 'center'}}>COLLECTED: ₹{currentTotal} / ₹{targetTotal}</span>
      </div>
    </div>
  );
}

const containerStyle = { fontFamily: "'JetBrains Mono', monospace", backgroundColor: '#000', color: '#fff', textTransform: 'uppercase' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '15px' };
const cardStyle = { border: '1px solid #222', padding: '20px', backgroundColor: '#000', marginBottom: '15px' };
const inputGroup = { display: 'flex', alignItems: 'center', backgroundColor: '#000', border: '1px solid #222', padding: '0 12px', marginBottom: '10px' };
const inputLabel = { fontSize: '10px', color: '#555', fontWeight: '800', marginRight: '10px' };
const inputStyle = { flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '12px 0', outline: 'none', fontFamily: "'JetBrains Mono', monospace" };
const payBtn = { backgroundColor: '#fff', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', height: '48px', fontSize: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const payedBtnStyle = { backgroundColor: '#000', color: '#555', border: '1px solid #222', fontWeight: '900', height: '48px', fontSize: '12px', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const playerRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: '12px' };
const labelStyle = { fontSize: '9px', color: '#555', fontWeight: '800', marginBottom: '10px', display: 'block' };
const miniBtn = { background: 'none', border: '1px solid #222', color: '#fff', fontSize: '10px', cursor: 'pointer', padding: '6px 12px' };