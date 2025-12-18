import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://zilfwtkpoazimylwlyli.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbGZ3dGtwb2F6aW15bHdseWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTczNDMsImV4cCI6MjA4MTYzMzM0M30.5p4nQ8nzfOXez0ut9lijiNDmKR3AFzBZU8Pff29V8Fc');

export default function App() {
  const [gameData, setGameData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState("");
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initApp();
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  async function initApp() {
    setLoading(true);
    // Fetch Settings
    const { data: settings } = await supabase.from('squad_settings').select('*').single();
    if (settings) setGameData(settings);

    // Fetch Players
    const { data: playersList } = await supabase.from('squad_players').select('*').order('created_at');
    if (playersList) setPlayers(playersList);
    
    setLoading(false);
  }

  // --- SAVE TURF DETAILS TO DB ---
  const saveSettings = async () => {
    const { error } = await supabase
      .from('squad_settings')
      .update({
        location: gameData.location,
        date: gameData.date,
        time: gameData.time,
        turf_price: gameData.turf_price,
        pay_to_number: gameData.pay_to_number,
        google_maps_link: gameData.google_maps_link
      })
      .eq('id', 1);

    if (error) alert("FAILED TO SAVE SETTINGS");
    else setIsEditingGame(false);
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data } = await supabase.from('squad_players').insert([{ name: newName.toUpperCase(), paid: false }]).select();
    if (data) setPlayers([...players, data[0]]);
    setNewName("");
  };

  const togglePaid = async (id, currentStatus) => {
    await supabase.from('squad_players').update({ paid: !currentStatus }).eq('id', id);
    setPlayers(players.map(p => p.id === id ? { ...p, paid: !currentStatus } : p));
  };

  const removePlayer = async (id) => {
    await supabase.from('squad_players').delete().eq('id', id);
    setPlayers(players.filter(p => p.id !== id));
  };

  if (loading || !gameData) return <div style={{color:'#fff', padding:'20px'}}>BOOTING_SYSTEM...</div>;

  const activeCount = players.length;
  const costPerPerson = activeCount > 0 ? Math.round(gameData.turf_price / activeCount) : gameData.turf_price;
  const totalReceived = players.filter(p => p.paid).length * costPerPerson;

  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const inputStyle = { ...mono, backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '12px', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ ...mono, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '20px', textTransform: 'uppercase' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>SQUAD_LINKS/_</h1>
          <button 
            onClick={() => isEditingGame ? saveSettings() : setIsEditingGame(true)}
            style={{ ...mono, backgroundColor: isEditingGame ? '#fff' : '#222', color: isEditingGame ? '#000' : '#fff', border: '1px solid #444', padding: '6px 12px', cursor: 'pointer', fontWeight: '800' }}
          >
            {isEditingGame ? '[CONFIRM_SAVE]' : '[EDIT_SESSION]'}
          </button>
        </div>

        {isEditingGame ? (
          <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input style={inputStyle} type="text" value={gameData.date} onChange={(e) => setGameData({...gameData, date: e.target.value})} placeholder="DATE" />
                <input style={inputStyle} type="text" value={gameData.time} onChange={(e) => setGameData({...gameData, time: e.target.value})} placeholder="TIME" />
              </div>
              <input style={inputStyle} type="text" value={gameData.location} onChange={(e) => setGameData({...gameData, location: e.target.value})} placeholder="LOCATION" />
              <input style={inputStyle} type="number" value={gameData.turf_price} onChange={(e) => setGameData({...gameData, turf_price: e.target.value})} placeholder="PRICE" />
              <input style={inputStyle} type="text" value={gameData.pay_to_number} onChange={(e) => setGameData({...gameData, pay_to_number: e.target.value})} placeholder="PAYMENT_ID" />
              <input style={inputStyle} type="text" value={gameData.google_maps_link} onChange={(e) => setGameData({...gameData, google_maps_link: e.target.value})} placeholder="MAPS_URL" />
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid #333', backgroundColor: '#111', padding: '20px', marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{gameData.location}</h2>
            <p style={{ fontSize: '11px', color: '#666', margin: '0 0 20px 0' }}>{gameData.date} // {gameData.time}</p>
            
            <div style={{ border: '1px solid #444', padding: '12px', marginBottom: '20px', backgroundColor: '#0a0a0a' }}>
              <span style={{ fontSize: '9px', color: '#666' }}>PAYMENT_DESTINATION:</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{gameData.pay_to_number}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{border: '1px solid #333', padding: '12px'}}><span style={{fontSize:'9px', color:'#666'}}>TURF_PRICE</span><p style={{margin:0}}>₹{gameData.turf_price}</p></div>
              <div style={{border: '1px solid #333', padding: '12px'}}><span style={{fontSize:'9px', color:'#666'}}>PER_HEAD</span><p style={{margin:0}}>₹{costPerPerson}</p></div>
              <div style={{ gridColumn: 'span 2', border: '1px solid #fff', padding: '15px', textAlign: 'center', backgroundColor: '#fff', color: '#000' }}>
                <span style={{ fontSize: '9px', fontWeight: '800' }}>COLLECTED</span>
                <p style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>₹{totalReceived} / ₹{gameData.turf_price}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={addPlayer} style={{ display: 'flex', marginBottom: '30px' }}>
          <input type="text" placeholder="PLAYER_NAME" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ ...inputStyle, flex: 1, borderRight: 'none' }} />
          <button type="submit" style={{ backgroundColor: '#fff', color: '#000', border: 'none', padding: '0 20px', fontWeight: '800' }}>+</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: '#111', border: '1px solid #222' }}>
              <span style={{ fontSize: '13px' }}>{p.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button onClick={() => togglePaid(p.id, p.paid)} style={{ ...mono, backgroundColor: p.paid ? '#fff' : 'transparent', color: p.paid ? '#000' : '#fff', border: '1px solid #fff', padding: '5px 12px', fontSize: '10px', minWidth: '85px' }}>
                  {p.paid ? 'PAID' : 'PENDING'}
                </button>
                <button onClick={() => removePlayer(p.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '12px' }}>[X]</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}