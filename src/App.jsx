import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- DATABASE CONFIG ---
const supabaseUrl = 'https://zilfwtkpoazimylwlyli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbGZ3dGtwb2F6aW15bHdseWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTczNDMsImV4cCI6MjA4MTYzMzM0M30.5p4nQ8nzfOXez0ut9lijiNDmKR3AFzBZU8Pff29V8Fc';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  // --- STATE ---
  const [gameData, setGameData] = useState({
    location: "Koramangala Social Turf",
    date: "Sunday, Oct 27",
    time: "7:00 PM",
    turfPrice: 2500,
    googleMapsLink: "https://maps.google.com",
    payToNumber: "9876543210" 
  });

  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState("");
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- DB LOGIC ---
  useEffect(() => {
    fetchPlayers();
    
    // Load Font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  async function fetchPlayers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('squad_players')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) console.error('Error fetching:', error);
    else setPlayers(data || []);
    setLoading(false);
  }

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const { data, error } = await supabase
      .from('squad_players')
      .insert([{ name: newName.toUpperCase(), paid: false }])
      .select();

    if (error) alert("Error adding player");
    else setPlayers([...players, data[0]]);
    setNewName("");
  };

  const togglePaid = async (id, currentStatus) => {
    const { error } = await supabase
      .from('squad_players')
      .update({ paid: !currentStatus })
      .eq('id', id);

    if (error) alert("Update failed");
    else setPlayers(players.map(p => p.id === id ? { ...p, paid: !currentStatus } : p));
  };

  const removePlayer = async (id) => {
    const { error } = await supabase
      .from('squad_players')
      .delete()
      .eq('id', id);

    if (error) alert("Delete failed");
    else setPlayers(players.filter(p => p.id !== id));
  };

  const clearAll = async () => {
    if (window.confirm("RESET ALL DATA?")) {
      const { error } = await supabase.from('squad_players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) alert("Clear failed");
      else setPlayers([]);
    }
  };

  // --- CALCS ---
  const activeCount = players.length;
  const costPerPerson = activeCount > 0 ? Math.round(gameData.turfPrice / activeCount) : gameData.turfPrice;
  const totalReceived = players.filter(p => p.paid).length * costPerPerson;

  // --- STYLES ---
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const inputStyle = { ...mono, backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '12px', outline: 'none', fontSize: '12px', width: '100%', boxSizing: 'border-box' };
  const labelStyle = { fontSize: '10px', color: '#888', marginBottom: '5px', display: 'block', fontWeight: '800' };
  const statBox = { border: '1px solid #333', padding: '12px', backgroundColor: '#161616' };
  const statLabel = { fontSize: '9px', color: '#666', display: 'block', marginBottom: '5px', fontWeight: '800' };
  const statVal = { fontSize: '16px', fontWeight: '800', margin: 0 };

  return (
    <div style={{ ...mono, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '20px', textTransform: 'uppercase' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>SQUAD_LINKS/_</h1>
          <button 
            onClick={() => setIsEditingGame(!isEditingGame)}
            style={{ ...mono, backgroundColor: isEditingGame ? '#fff' : '#222', color: isEditingGame ? '#000' : '#fff', border: '1px solid #444', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}
          >
            {isEditingGame ? '[SAVE]' : '[EDIT_SESSION]'}
          </button>
        </div>

        {isEditingGame ? (
          <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>DATE</label><input style={inputStyle} type="text" value={gameData.date} onChange={(e) => setGameData({...gameData, date: e.target.value})} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>TIME</label><input style={inputStyle} type="text" value={gameData.time} onChange={(e) => setGameData({...gameData, time: e.target.value})} /></div>
              </div>
              <div><label style={labelStyle}>TURF_LOCATION</label><input style={inputStyle} type="text" value={gameData.location} onChange={(e) => setGameData({...gameData, location: e.target.value})} /></div>
              <div><label style={labelStyle}>TOTAL_PRICE (₹)</label><input style={inputStyle} type="number" value={gameData.turfPrice} onChange={(e) => setGameData({...gameData, turfPrice: e.target.value})} /></div>
              <div><label style={labelStyle}>PAYMENT_ID / UPI</label><input style={inputStyle} type="text" value={gameData.payToNumber} onChange={(e) => setGameData({...gameData, payToNumber: e.target.value})} /></div>
              <div><label style={labelStyle}>MAPS_URL</label><input style={inputStyle} type="text" value={gameData.googleMapsLink} onChange={(e) => setGameData({...gameData, googleMapsLink: e.target.value})} /></div>
              <button onClick={clearAll} style={{ ...mono, backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}>// ERASE_ALL_PLAYERS</button>
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid #333', backgroundColor: '#111', padding: '20px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
               <div>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{gameData.location}</h2>
                  <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>{gameData.date} // {gameData.time}</p>
               </div>
               <button onClick={() => {navigator.clipboard.writeText(gameData.googleMapsLink); alert("COPIED");}} style={{ ...mono, background: '#222', border: '1px solid #444', color: '#fff', padding: '5px 10px', fontSize: '10px', cursor: 'pointer' }}>[MAPS]</button>
            </div>
            <div style={{ border: '1px solid #444', padding: '12px', marginBottom: '20px', backgroundColor: '#0a0a0a' }}>
              <span style={{ fontSize: '9px', color: '#666' }}>PAYMENT_ID:</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px' }}>{gameData.payToNumber}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={statBox}><span style={statLabel}>TURF_PRICE</span><p style={statVal}>₹{gameData.turfPrice}</p></div>
              <div style={statBox}><span style={statLabel}>COST_PER_HEAD</span><p style={statVal}>₹{costPerPerson}</p></div>
              <div style={{ gridColumn: 'span 2', border: '1px solid #fff', padding: '15px', textAlign: 'center', backgroundColor: '#fff', color: '#000' }}>
                <span style={{ fontSize: '9px', color: '#666', display: 'block', marginBottom: '5px' }}>MONEY_RECEIVED</span>
                <p style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>₹{totalReceived} / ₹{gameData.turfPrice}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={addPlayer} style={{ display: 'flex', marginBottom: '30px' }}>
          <input type="text" placeholder="ENTER_NAME" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ ...inputStyle, flex: 1, borderRight: 'none', backgroundColor: '#0a0a0a' }} />
          <button type="submit" style={{ ...mono, backgroundColor: '#fff', color: '#000', border: '1px solid #fff', padding: '0 20px', fontWeight: '800', cursor: 'pointer' }}>+</button>
        </form>

        <div style={{ paddingBottom: '50px' }}>
          <h3 style={{ fontSize: '11px', color: '#666', marginBottom: '15px' }}>{`// PLAYERS: ${activeCount}`}</h3>
          {loading ? <p style={{fontSize: '10px'}}>SYNCING_WITH_DB...</p> : 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: '#111', border: '1px solid #222' }}>
                  <span style={{ fontSize: '13px' }}>{p.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => togglePaid(p.id, p.paid)} style={{ ...mono, backgroundColor: p.paid ? '#fff' : 'transparent', color: p.paid ? '#000' : '#fff', border: '1px solid #fff', padding: '5px 12px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', minWidth: '85px' }}>
                      {p.paid ? 'PAID' : 'PENDING'}
                    </button>
                    <button onClick={() => removePlayer(p.id)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '12px' }}>[X]</button>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  );
}