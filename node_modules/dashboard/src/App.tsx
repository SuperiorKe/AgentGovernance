import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import './App.css'

const API_BASE = 'http://localhost:3000/api/v1';
const socket = io('http://localhost:3000');

function App() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  
  const [ruleForm, setRuleForm] = useState({
    agent_id: '',
    action_type: 'price_change', // default
    field: 'change_percentage',
    operator: 'gt',
    threshold: 0.1,
    consequence: 'require_approval'
  });
  const [ruleMessage, setRuleMessage] = useState('');

  useEffect(() => {
    fetchPending();
    fetchAgents();

    socket.on('new_approval_request', () => {
      fetchPending();
    });

    socket.on('approval_handled', (data) => {
      setApprovals(prev => prev.filter(a => a.id !== data.action_id));
      fetchPending();
    });

    return () => {
      socket.off('new_approval_request');
      socket.off('approval_handled');
    };
  }, []);

  // Set default agent selection initially
  useEffect(() => {
    if (agents.length > 0 && !ruleForm.agent_id) {
      setRuleForm(prev => ({ ...prev, agent_id: agents[0].id }));
      fetchRules(agents[0].id);
    }
  }, [agents]);

  // Poll audit log & performance every 30 seconds
  useEffect(() => {
    if (agents.length === 0) return;
    
    // Fetch immediately
    fetchAudit(agents[0].id);
    fetchPerformance(agents[0].id);
    
    const intervalId = setInterval(() => {
      fetchAudit(agents[0].id);
      fetchPerformance(agents[0].id);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [agents]);

  const fetchPending = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/approvals/pending`);
      setApprovals(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/agents`);
      setAgents(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAudit = async (agent_id: string) => {
    try {
      const { data } = await axios.get(`${API_BASE}/audit?agent_id=${agent_id}`);
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    }
  }

  const fetchPerformance = async (agent_id: string) => {
    try {
      const { data } = await axios.get(`${API_BASE}/agents/${agent_id}/performance`);
      setPerformance(data);
    } catch (e) {
      console.error(e);
    }
  }

  const fetchRules = async (agent_id: string) => {
    try {
      const { data } = await axios.get(`${API_BASE}/rules?agent_id=${agent_id}`);
      // Parse condition JSON if it's a string
      const parsedRules = data.map((r: any) => {
        let conditionObj = r.condition;
        if (typeof conditionObj === 'string') {
          try { conditionObj = JSON.parse(conditionObj); } catch(e){}
        }
        return { ...r, condition: conditionObj };
      });
      setRules(parsedRules);
    } catch (e) {
      console.error(e);
    }
  }

  const handleDecision = async (action_id: string, decision: 'approved' | 'rejected') => {
    let reason = '';
    if (decision === 'rejected') {
      reason = prompt('Reason for rejection:') || 'Rejected by owner';
    }
    
    const approver_id = agents[0]?.owner_id || 'fallback-id';

    try {
      await axios.post(`${API_BASE}/approvals/decision`, {
        action_id, decision, reason, approver_id
      });
      setApprovals(prev => prev.filter(a => a.id !== action_id));
      
      // Update Audit and Performance immediately after action
      if (agents.length > 0) {
        fetchAudit(agents[0].id);
        fetchPerformance(agents[0].id);
      }
    } catch (e) {
      console.error(e);
      alert('Error updating approval');
    }
  }

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleMessage('');

    if (!ruleForm.agent_id) return setRuleMessage('Error: No agent selected');

    const condition = {
      field: ruleForm.field,
      operator: ruleForm.operator,
      threshold: Number(ruleForm.threshold)
    };

    try {
      await axios.post(`${API_BASE}/rules`, {
        agent_id: ruleForm.agent_id,
        action_type: ruleForm.action_type,
        condition,
        consequence: ruleForm.consequence
      });
      setRuleMessage('Success: Rule created!');
      
      // Refresh list
      fetchRules(ruleForm.agent_id);
    } catch (err) {
      console.error(err);
      setRuleMessage('Error: Failed to create rule');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Agent Governance Dashboard</h1>
      
      {performance && (
        <section style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
          <div style={{ flex: 1, padding: '1.5rem', backgroundColor: '#f0f4f8', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Success Rate</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>
              {(performance.success_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', backgroundColor: '#f0f4f8', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Avg Latency</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>
              {Math.round(performance.avg_latency_ms)} ms
            </p>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', backgroundColor: '#f0f4f8', borderRadius: '8px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>User Apprv. Rate</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#0f172a' }}>
              {(performance.user_acceptance_rate * 100).toFixed(0)}%
            </p>
          </div>
        </section>
      )}

      <section style={{ marginBottom: '3rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, backgroundColor: '#fafafa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h2 style={{ marginTop: 0 }}>Configure Rule</h2>
          
          <form onSubmit={handleSubmitRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Select Agent</label>
              <select 
                value={ruleForm.agent_id} 
                onChange={e => {
                  setRuleForm(f => ({...f, agent_id: e.target.value}));
                  fetchRules(e.target.value);
                }} 
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="" disabled>Select an agent...</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Action Type</label>
              <input 
                type="text" 
                value={ruleForm.action_type} 
                onChange={e => setRuleForm(f => ({...f, action_type: e.target.value}))} 
                placeholder="e.g. price_change"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Target Field</label>
                <input 
                  type="text" 
                  value={ruleForm.field} 
                  onChange={e => setRuleForm(f => ({...f, field: e.target.value}))} 
                  placeholder="e.g. change_percentage"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Operator</label>
                <select 
                  value={ruleForm.operator} 
                  onChange={e => setRuleForm(f => ({...f, operator: e.target.value}))} 
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                >
                  <option value="gt">&gt;</option>
                  <option value="lt">&lt;</option>
                  <option value="eq">=</option>
                  <option value="gte">&gt;=</option>
                  <option value="lte">&lt;=</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Threshold</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={ruleForm.threshold} 
                  onChange={e => setRuleForm(f => ({...f, threshold: parseFloat(e.target.value)}))} 
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Consequence</label>
              <select 
                value={ruleForm.consequence} 
                onChange={e => setRuleForm(f => ({...f, consequence: e.target.value}))} 
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              >
                <option value="auto_approve">Auto Approve</option>
                <option value="require_approval">Require Approval</option>
                <option value="block">Block</option>
              </select>
            </div>

            <button type="submit" style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Create Rule
            </button>

            {ruleMessage && (
              <div style={{ padding: '10px', borderRadius: '4px', backgroundColor: ruleMessage.includes('Error') ? '#fee2e2' : '#dcfce7', color: ruleMessage.includes('Error') ? '#991b1b' : '#166534' }}>
                {ruleMessage}
              </div>
            )}
          </form>
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ marginTop: 0 }}>Active Rules</h2>
          {rules.length === 0 ? (
            <p>No rules configured for this agent.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rules.map(r => (
                <div key={r.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>On: {r.action_type}</div>
                  <div style={{ fontSize: '0.9em', color: '#475569', marginBottom: '0.5rem' }}>
                    If <strong>{r.condition.field} {r.condition.operator} {r.condition.threshold}</strong>
                  </div>
                  <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold', backgroundColor: r.consequence === 'auto_approve' ? '#dcfce7' : r.consequence === 'block' ? '#fee2e2' : '#fef9c3', color: r.consequence === 'auto_approve' ? '#166534' : r.consequence === 'block' ? '#991b1b' : '#854d0e' }}>
                    {r.consequence.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Pending Approvals ({approvals.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {approvals.map(app => (
            <div key={app.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
              <h3>Agent: {app.agent_name}</h3>
              <p><strong>Action Type:</strong> {app.action_type}</p>
              <p><strong>Proposed Value:</strong> {JSON.stringify(app.proposed_value)}</p>
              <p><strong>Reasoning:</strong> {app.reasoning}</p>
              <p><small>Timeout At: {new Date(app.timeout_at).toLocaleString()}</small></p>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => handleDecision(app.id, 'approved')}
                  style={{ background: '#4CAF50', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleDecision(app.id, 'rejected')}
                  style={{ background: '#f44336', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}

          {approvals.length === 0 && <p>All caught up! No pending approvals.</p>}
        </div>
      </section>

      <section>
        <h2>Audit Log</h2>
        {auditLogs.length === 0 ? (
          <p>No audit events recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '12px' }}>When</th>
                <th style={{ padding: '12px' }}>Action Type</th>
                <th style={{ padding: '12px' }}>Proposed Value</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Decided By</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.action_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    {new Date(log.resolved_at || log.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px' }}>{log.action_type}</td>
                  <td style={{ padding: '12px', fontSize: '0.9em' }}>
                    {JSON.stringify(log.proposed_value)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em',
                      backgroundColor: log.status === 'approved' || log.status === 'auto_approved' ? '#e8f5e9' : 
                                       log.status === 'rejected' || log.status === 'blocked' ? '#ffebee' : '#fff3e0'
                    }}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{log.decided_by || 'Auto/System'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default App
