import React, { useState, useEffect } from 'react';

export default function App() {
  // --- LOAD FONT ---
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

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

  // --- LOGIC ---
  const activeCount = players.length;
  const costPerPerson = activeCount > 0 ? Math.round(gameData.turfPrice / activeCount) : gameData.turfPrice;
  const totalReceived = players.filter(p => p.paid).length * costPerPerson;

  const addPlayer = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setPlayers([...players, { id: Date.now(), name: newName, paid: false }]);
    setNewName("");
  };

  const togglePaid = (id) => {
    setPlayers(players.map(p => p.id === id ? { ...p, paid: !p.paid } : p));
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const clearAll = () => {
    if (window.confirm("RESET ALL DATA?")) setPlayers([]);
  };

  // --- STYLES ---
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  const inputStyle = { 
    ...mono, 
    backgroundColor: '#1a1a1a', // Dark Grey
    border: '1px solid #333', 
    color: '#fff', 
    padding: '12px', 
    outline: 'none', 
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box' // Fixes the overflow issue
  };

  const labelStyle = {
    fontSize: '10px',
    color: '#888',
    marginBottom: '5px',
    display: 'block',
    fontWeight: '800'
  };

  return (
    <div style={{ ...mono, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', padding: '20px', textTransform: 'uppercase' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>TURF</h1>
          <button 
            onClick={() => setIsEditingGame(!isEditingGame)}
            style={{ ...mono, backgroundColor: isEditingGame ? '#fff' : '#222', color: isEditingGame ? '#000' : '#fff', border: '1px solid #444', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}
          >
            {isEditingGame ? '[SAVE]' : '[EDIT_SESSION]'}
          </button>
        </div>

        {/* SETTINGS PANEL */}
        {isEditingGame && (
          <div style={{ backgroundColor: '#111', border: '1px solid #333', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>SESSION_DATE</label>
                  <input style={inputStyle} type="text" value={gameData.date} onChange={(e) => setGameData({...gameData, date: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>SESSION_TIME</label>
                  <input style={inputStyle} type="text" value={gameData.time} onChange={(e) => setGameData({...gameData, time: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>TURF_LOCATION</label>
                <input style={inputStyle} type="text" value={gameData.location} onChange={(e) => setGameData({...gameData, location: e.target.value})} />
              </div>

              <div>
                <label style={labelStyle}>TOTAL_PRICE (₹)</label>
                <input style={inputStyle} type="number" value={gameData.turfPrice} onChange={(e) => setGameData({...gameData, turfPrice: e.target.value})} />
              </div>

              <div>
                <label style={labelStyle}>PAYMENT_ID / UPI</label>
                <input style={inputStyle} type="text" value={gameData.payToNumber} onChange={(e) => setGameData({...gameData, payToNumber: e.target.value})} />
              </div>

              <div>
                <label style={labelStyle}>MAPS_URL</label>
                <input style={inputStyle} type="text" value={gameData.googleMapsLink} onChange={(e) => setGameData({...gameData, googleMapsLink: e.target.value})} />
              </div>

              <button onClick={clearAll} style={{ ...mono, backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '10px', cursor: 'pointer', fontSize: '11px', fontWeight: '800', marginTop: '10px' }}>
                // REMOVE_ALL_PLAYERS
              </button>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {!isEditingGame && (
          <div style={{ border: '1px solid #333', backgroundColor: '#111', padding: '20px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
               <div>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', letterSpacing: '-1px' }}>{gameData.location}</h2>
                  <p style={{ fontSize: '15px', color: '#dcdcdcff', margin: 0 }}>{gameData.date} // {gameData.time}</p>
               </div>
               <button onClick={() => {navigator.clipboard.writeText(gameData.googleMapsLink); alert("COPIED");}} style={{ ...mono, background: '#222', border: '1px solid #444', color: '#fff', padding: '5px 10px', fontSize: '10px', cursor: 'pointer' }}>[COPY LOCATION]</button>
            </div>
            
            <div style={{ border: '1px solid #444', padding: '12px', marginBottom: '20px', backgroundColor: '#0a0a0a' }}>
              <span style={{ fontSize: '9px', color: '#666', fontWeight: '800' }}>PAYMENT_TO:</span>
              <p style={{ margin: '4px 0 0 0', fontWeight: '800', fontSize: '15px', color: '#fff' }}>{gameData.payToNumber}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={statBox}>
                <span style={statLabel}>TURF_PRICE</span>
                <p style={statVal}>₹{gameData.turfPrice}</p>
              </div>
              <div style={statBox}>
                <span style={statLabel}>COST_PER_HEAD</span>
                <p style={statVal}>₹{costPerPerson}</p>
              </div>
              <div style={{ gridColumn: 'span 2', border: '1px solid #fff', padding: '15px', textAlign: 'center', backgroundColor: '#fff', color: '#000' }}>
                <span style={{ fontSize: '9px', color: '#666', fontWeight: '800', display: 'block', marginBottom: '5px' }}>FUNDS_COLLECTED</span>
                <p style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>
                  ₹{totalReceived} <span style={{color: '#888'}}>/</span> ₹{gameData.turfPrice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ADD PLAYER */}
        <form onSubmit={addPlayer} style={{ display: 'flex', marginBottom: '30px' }}>
          <input 
            type="text" 
            placeholder="ENTER_PLAYER_NAME" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            style={{ ...inputStyle, flex: 1, borderRight: 'none', backgroundColor: '#0a0a0a' }}
          />
          <button type="submit" style={{ ...mono, backgroundColor: '#fff', color: '#000', border: '1px solid #fff', padding: '0 20px', fontWeight: '800', cursor: 'pointer' }}>+</button>
        </form>

        {/* PLAYERS LIST */}
        <div style={{ paddingBottom: '50px' }}>
          <h3 style={{ fontSize: '11px', color: '#666', marginBottom: '15px' }}>{`// PLAYERS: ${activeCount}`}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {players.map(player => (
              <div key={player.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', backgroundColor: '#111', border: '1px solid #222' }}>
                <span style={{ fontSize: '13px', fontWeight: '400' }}>{player.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button 
                    onClick={() => togglePaid(player.id)}
                    style={{ 
                      ...mono,
                      backgroundColor: player.paid ? '#fff' : 'transparent', 
                      color: player.paid ? '#000' : '#fff', 
                      border: '1px solid #fff',
                      padding: '5px 12px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', minWidth: '85px'
                    }}
                  >
                    {player.paid ? 'PAID' : 'PENDING'}
                  </button>
                  <button onClick={() => removePlayer(player.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#ff4444', padding: 0, opacity: 0.7 }}>[X]</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const statBox = { border: '1px solid #333', padding: '12px', backgroundColor: '#161616' };
const statLabel = { fontSize: '9px', color: '#666', display: 'block', marginBottom: '5px', fontWeight: '800' };
const statVal = { fontSize: '16px', fontWeight: '800', margin: 0 };