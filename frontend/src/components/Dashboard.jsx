import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const fetchDocuments = async (token) => {
    try {
      const res = await axios.get(`${API_URL}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
    } else {
      setUser(JSON.parse(userData));
      fetchDocuments(token);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('document', selectedFile);

    try {
      await axios.post(`${API_URL}/api/documents/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments(token);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (docId) => {
    setVerifyingId(docId);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/api/documents/${docId}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments(token);
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setVerifyingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="glass-container dashboard-container" style={{ maxWidth: '900px' }}>
      <div className="header-actions">
        <h3>AI Verification Portal</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="user-badge">
            <span role="img" aria-label="user">👤</span> {user.name}
          </div>
          <button onClick={handleLogout} className="secondary-btn" style={{ marginTop: 0, padding: '0.4rem 1rem' }}>
            Logout
          </button>
        </div>
      </div>

      <div 
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>📄</span>
          <h4>Drag & Drop your document here</h4>
          <p style={{ color: '#cbd5e1', margin: '0.5rem 0 1.5rem', fontSize: '0.875rem' }}>
            Supports PDF, JPG, PNG up to 10MB
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleChange}
          />
          
          {selectedFile ? (
            <div className="selected-file">
              <span className="file-name">{selectedFile.name}</span>
              <button 
                className="upload-btn" 
                onClick={handleUpload} 
                disabled={loading}
              >
                {loading ? 'Uploading...' : 'Confirm Upload'}
              </button>
              <button 
                className="cancel-btn" 
                onClick={() => { setSelectedFile(null); fileInputRef.current.value = ""; }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button className="browse-btn" onClick={onButtonClick}>
              Browse Files (Images Only)
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <h3 style={{ marginBottom: '1rem', textAlign: 'left' }}>Verification History</h3>
        {documents.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            No documents uploaded yet. Upload one above to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Upload Date</th>
                <th>AI Scan Results</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 500, maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.filename}>
                    {doc.filename}
                  </td>
                  <td style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                    {new Date(doc.upload_date).toLocaleString()}
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem', maxWidth: '300px', whiteSpace: 'pre-wrap' }}>
                    {doc.extracted_text ? doc.extracted_text.substring(0, 50) + (doc.extracted_text.length > 50 ? '...' : '') : 'Pending OCR scan...'}
                  </td>
                  <td>
                    <span className={`badge ${doc.status.toLowerCase()}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    {doc.status === 'Pending' && (
                      <button 
                        className="action-btn"
                        onClick={() => handleVerify(doc.id)}
                        disabled={verifyingId === doc.id}
                      >
                        {verifyingId === doc.id ? (
                          <><span className="spinner"></span>Scanning Image...</>
                        ) : 'Run AI Verify'}
                      </button>
                    )}
                    {doc.status !== 'Pending' && (
                      <span style={{ color: '#94a3b8', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>✓</span> Completed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
