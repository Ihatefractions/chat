import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// --- IMPORTANT: CONFIGURE YOUR SERVER URL HERE ---
// You will get this URL from Replit after you run the server.
const SERVER_URL = "https://your-replit-url.repl.co"; 
// -------------------------------------------------

const socket = io(SERVER_URL);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [rooms, setRooms] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const [currentView, setCurrentView] = useState('chat');

    const messagesEndRef = useRef(null);

    // --- Socket.IO Event Listeners ---
    useEffect(() => {
        socket.on('auth_success', (userData) => {
            setUser(userData.username);
            setIsAdmin(userData.isAdmin);
            setError('');
            socket.emit('join_room', 'General'); // Auto-join General chat on login
            setCurrentRoom('General');
            if(userData.isAdmin) {
                socket.emit('admin_get_all_data');
            }
        });

        socket.on('auth_error', (errorMessage) => {
            setError(errorMessage);
        });
        
        socket.on('init_room_data', (data) => {
            setRooms(data.rooms);
            setAllUsers(data.users);
            if (data.messages) {
                 setMessages(data.messages);
            }
        });

        socket.on('new_message', (message) => {
            setMessages(prevMessages => [...prevMessages, message]);
        });
        
        socket.on('update_room_list', (updatedRooms) => {
            setRooms(updatedRooms);
        });

        socket.on('update_user_list', (updatedUsers) => {
            setAllUsers(updatedUsers);
        });

        socket.on('force_disconnect', (reason) => {
            alert(reason);
            setUser(null);
            setIsAdmin(false);
        });

        // Cleanup listeners on component unmount
        return () => {
            socket.off('auth_success');
            socket.off('auth_error');
            socket.off('init_room_data');
            socket.off('new_message');
            socket.off('update_room_list');
            socket.off('update_user_list');
            socket.off('force_disconnect');
        };
    }, []);

     // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Handler Functions ---
    const handleAuthAction = (e) => {
        e.preventDefault();
        setError('');
        const event = authMode === 'signup' ? 'signup' : 'login';
        socket.emit(event, { username, password });
    };
    
    const handleLogout = () => {
        setUser(null);
        setIsAdmin(false);
        setCurrentRoom(null);
        setCurrentView('chat');
        // We don't need to tell the server; it knows via disconnect event
    };

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (newRoomName.trim()) {
            socket.emit('create_room', newRoomName);
            setNewRoomName('');
        }
    };
    
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && currentRoom) {
            socket.emit('send_message', { roomName: currentRoom, text: newMessage });
            setNewMessage('');
        }
    };

    const handleSelectRoom = (roomName) => {
        setCurrentRoom(roomName);
        setMessages([]); // Clear old messages
        socket.emit('join_room', roomName);
    };

    const handleToggleBan = (usernameToBan) => {
        if (isAdmin) {
            socket.emit('admin_toggle_ban', usernameToBan);
        }
    };
    
    if (!user) { // --- Authentication View ---
        return (
             <div className="flex items-center justify-center h-screen bg-gray-800 font-sans">
                <div className="w-full max-w-md p-8 space-y-6 bg-gray-900 rounded-xl shadow-lg">
                    <h2 className="text-3xl font-bold text-center text-white">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                    <form onSubmit={handleAuthAction} className="space-y-6">
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition duration-200">{authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
                    </form>
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    <p className="text-center text-gray-400">
                        {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-blue-400 hover:underline">{authMode === 'login' ? 'Sign Up' : 'Log In'}</button>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen font-sans bg-gray-900 text-white">
            <div className="w-1/4 bg-gray-800 p-4 flex flex-col border-r border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold">Friend Chat</h1>
                    <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
                </div>
                <p className="text-xs text-gray-400 mb-2">Logged in as {user} {isAdmin && <span className="text-yellow-400">(Admin)</span>}</p>

                {isAdmin && (
                    <div className="flex space-x-2 mb-4">
                        <button onClick={() => setCurrentView('chat')} className={`flex-1 p-2 text-sm rounded-md ${currentView === 'chat' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Chat</button>
                        <button onClick={() => setCurrentView('admin')} className={`flex-1 p-2 text-sm rounded-md ${currentView === 'admin' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Admin Panel</button>
                    </div>
                )}
                
                {currentView === 'chat' && (
                    <>
                        <form onSubmit={handleCreateRoom} className="flex mb-4">
                            <input type="text" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Create a new room" className="flex-grow p-2 bg-gray-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"/>
                            <button type="submit" className="px-3 py-2 bg-blue-600 rounded-r-md hover:bg-blue-700 text-sm">+</button>
                        </form>
                        <h2 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Rooms</h2>
                        <div className="flex-grow overflow-y-auto pr-2">
                            {rooms.map(roomName => (
                                <div key={roomName} onClick={() => handleSelectRoom(roomName)} className={`p-2 rounded-md cursor-pointer mb-1 text-sm ${currentRoom === roomName ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}># {roomName}</div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            
            <div className="w-3/4 flex flex-col">
                {currentView === 'chat' && !currentRoom && <div className="flex items-center justify-center h-full"><p className="text-gray-400">Select a room to start chatting.</p></div>}
                {currentView === 'chat' && currentRoom && (
                    <>
                        <div className="p-4 bg-gray-800 border-b border-gray-700"><h2 className="text-2xl font-bold"># {currentRoom}</h2></div>
                        <div className="flex-grow p-4 overflow-y-auto">
                            {messages.map(message => (
                                <div key={message.id} className="flex items-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">{message.senderName.substring(0, 2).toUpperCase()}</div>
                                    <div>
                                        <div className="flex items-center"><span className="font-bold text-blue-400 mr-2">{message.senderName}</span><span className="text-xs text-gray-500">{message.timestamp}</span></div>
                                        <p className="text-gray-300">{message.text}</p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-gray-800 border-t border-gray-700">
                            <form onSubmit={handleSendMessage} className="flex">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={`Message #${currentRoom}`} className="flex-grow p-2 bg-gray-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                <button type="submit" className="px-4 py-2 bg-blue-600 rounded-r-md hover:bg-blue-700">Send</button>
                            </form>
                        </div>
                    </>
                )}

                {currentView === 'admin' && isAdmin && (
                    <div className="p-4 flex flex-col">
                        <h2 className="text-2xl font-bold border-b border-gray-700 pb-2 mb-4">Admin Panel: User Management</h2>
                        <div className="overflow-y-auto">
                           <table className="w-full text-left">
                               <thead className="bg-gray-700"><tr><th className="p-2">Username</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead>
                               <tbody>
                                   {allUsers.map(u => (
                                       <tr key={u.username} className="border-b border-gray-700">
                                           <td className="p-2">{u.username}</td>
                                           <td className="p-2"><span className={`px-2 py-1 rounded-full text-xs ${u.isBanned ? 'bg-red-500' : 'bg-green-500'}`}>{u.isBanned ? 'Banned' : 'Active'}</span></td>
                                           <td className="p-2">{u.username !== "admin" && <button onClick={() => handleToggleBan(u.username)} className={`px-3 py-1 text-xs rounded-md ${u.isBanned ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-red-500 hover:bg-red-600'}`}>{u.isBanned ? 'Unban' : 'Ban'}</button>}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

