import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Files,
  History,
  Search,
  Bell,
  Shield,
  Bot,
  X,
  Send,
} from 'lucide-react';
import xebiaLogo from '../../assets/xebia-logo.png';
import { kycService } from '../../services/kycService';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCount, setPendingCount] = useState(4);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'agent' | 'user'; text: string; time: string }>
  >([
    {
      sender: 'agent',
      text: 'Hello Demo Reviewer! I am your KYC & Sanctions Assistant for this demo environment. Ask me about flagged cases, match reasons, or sanctions list sources.',
      time: '10:45 AM',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Fetch pending review cases count
  useEffect(() => {
    kycService.getCases().then((cases) => {
      const pending = cases.filter((c) => c.reviewerDecision === 'Pending review').length;
      setPendingCount(pending);
    });
  }, [location.pathname]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/cases?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;

    const userMsg = { sender: 'user' as const, text, time: '10:46 AM' };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');

    // Deterministic Mock Responses
    setTimeout(() => {
      let reply = "This is a demonstration response. The data used across this app is fictionalized for KYC & sanctions screening validation.";
      const lower = text.toLowerCase();
      if (lower.includes('kyc-0042') || lower.includes('lena varga')) {
        reply = "Case KYC-0042 (Lena Varga) was flagged because the customer's name directly matches entry 'Lena Varga' (SANC-004) and the Date of Birth (1990-02-14) is identical. Status is currently Pending Review.";
      } else if (lower.includes('kyc-0034') || lower.includes('selim')) {
        reply = "Case KYC-0034 (Selim Arcadius) matched SANC-001 with 100% confirmation on primary name, DOB (1978-04-12), and Syrian nationality. It has been pending for over 2 hours.";
      } else if (lower.includes('match') || lower.includes('rule')) {
        reply = "Screening Rule: A case is marked as a Potential Match if the normalized customer name or alias contains/matches a list entry AND either DOB or Nationality matches.";
      } else if (lower.includes('sanction') || lower.includes('source')) {
        reply = "The current source is 'Mock Sanctions List' with 7 fictional designated entities. No real individual data is present.";
      }

      setChatMessages((prev) => [...prev, { sender: 'agent', text: reply, time: '10:46 AM' }]);
    }, 400);
  };

  // Determine current page title
  let pageTitle = 'Dashboard';
  if (location.pathname.startsWith('/new-case') || location.pathname.startsWith('/screening/new')) {
    pageTitle = 'New Screening';
  } else if (location.pathname.startsWith('/cases')) {
    pageTitle = 'Screening Cases';
  } else if (location.pathname.startsWith('/result')) {
    pageTitle = 'Screening Result';
  } else if (location.pathname.startsWith('/audit')) {
    pageTitle = 'Audit Trail';
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#111827',
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: '230px',
          minWidth: '230px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div>
          {/* Logo & Brand Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <img
                src={xebiaLogo}
                alt="Xebia"
                style={{ height: '24px', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#831B84',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <Shield size={14} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', letterSpacing: '-0.2px' }}>
                KYC Screening
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav
            style={{
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {/* 1. Dashboard */}
            <NavLink
              to="/dashboard"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#831B84' : '#4B5563',
                backgroundColor: isActive ? '#FAF4FB' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>

            {/* 2. New Screening */}
            <NavLink
              to="/new-case"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#831B84' : '#4B5563',
                backgroundColor: isActive ? '#FAF4FB' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <UserPlus size={18} />
              <span>New Screening</span>
            </NavLink>

            {/* 3. Screening Cases (with badge) */}
            <NavLink
              to="/cases"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#831B84' : '#4B5563',
                backgroundColor: isActive ? '#FAF4FB' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Files size={18} />
                <span>Screening Cases</span>
              </div>
              {pendingCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#FDE7E9',
                    color: '#D13438',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '9999px',
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </NavLink>

            {/* 4. Audit Trail */}
            <NavLink
              to="/audit"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#831B84' : '#4B5563',
                backgroundColor: isActive ? '#FAF4FB' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <History size={18} />
              <span>Audit Trail</span>
            </NavLink>
          </nav>
        </div>

        {/* Bottom Screening Source Card */}
        <div style={{ padding: '16px 14px' }}>
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94A3B8',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Screening Source
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1E293B',
              }}
            >
              Mock Sanctions List
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#64748B',
                marginTop: '2px',
              }}
            >
              7 entries · fictional data
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* TOP BAR */}
        <header
          style={{
            height: '56px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 5,
          }}
        >
          {/* Left: Page Title & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#111827',
              }}
            >
              {pageTitle}
            </span>

            {/* Global Search */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  color: '#9CA3AF',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search case ID or customer name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                style={{
                  width: '280px',
                  height: '34px',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  fontSize: '12px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  outline: 'none',
                  color: '#111827',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#831B84')}
                onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
              />
            </div>

            {/* DEMO · MOCKED DATA Pill */}
            <span
              style={{
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                padding: '3px 8px',
                borderRadius: '9999px',
                textTransform: 'uppercase',
              }}
            >
              Demo · Mocked Data
            </span>
          </div>

          {/* Right: Notifications & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Notification Bell */}
            <button
              onClick={() => navigate('/cases?status=pending')}
              title={`${pendingCount} pending reviews`}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                color: '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} />
              {pendingCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    backgroundColor: '#D13438',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            {/* User Profile Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingLeft: '8px',
                borderLeft: '1px solid #F3F4F6',
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                  Demo Reviewer
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  KYC Analyst · L1
                </div>
              </div>

              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9999px',
                  backgroundColor: '#FAF4FB',
                  color: '#831B84',
                  border: '1px solid #EDE0EE',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                DR
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY OUTLET */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet context={{ openCopilot: () => setIsCopilotOpen(true) }} />
        </main>
      </div>

      {/* COPILOT STUDIO AGENT SIDE DRAWER */}
      {isCopilotOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '380px',
            backgroundColor: '#FFFFFF',
            boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FAF4FB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#831B84',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={16} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                  KYC Copilot Assistant
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  Copilot Studio · Mocked cases
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCopilotOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6B7280',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Questions Chips */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <button
              onClick={() => handleSendMessage('Why was case KYC-0042 flagged?')}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '11px',
                color: '#4B5563',
                cursor: 'pointer',
              }}
            >
              Why was KYC-0042 flagged?
            </button>
            <button
              onClick={() => handleSendMessage('What is the matching rule?')}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '11px',
                color: '#4B5563',
                cursor: 'pointer',
              }}
            >
              Explain matching rule
            </button>
            <button
              onClick={() => handleSendMessage('Which sanctions list is used?')}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '9999px',
                padding: '4px 10px',
                fontSize: '11px',
                color: '#4B5563',
                cursor: 'pointer',
              }}
            >
              Sanctions source
            </button>
          </div>

          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    backgroundColor: msg.sender === 'user' ? '#831B84' : '#F3F4F6',
                    color: msg.sender === 'user' ? '#FFFFFF' : '#1F2937',
                    padding: '10px 14px',
                    borderRadius:
                      msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    fontSize: '12px',
                    lineHeight: 1.45,
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#9CA3AF',
                    marginTop: '2px',
                    textAlign: msg.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  {msg.time}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              gap: '8px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <input
              type="text"
              placeholder="Ask about a case or match reason..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              style={{
                flex: 1,
                height: '36px',
                padding: '0 12px',
                fontSize: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              style={{
                backgroundColor: '#831B84',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
