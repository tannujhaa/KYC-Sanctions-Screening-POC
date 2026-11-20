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
  RotateCcw,
} from 'lucide-react';
import xebiaLogo from '../../assets/xebia-logo.png';
import { kycService } from '../../services/kycService';
import { getContext } from '@microsoft/power-apps/app';
import type { IContext } from '@microsoft/power-apps/app';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingCount, setPendingCount] = useState(4);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [currentUser, setCurrentUser] = useState({
    fullName: 'Demo Reviewer',
    email: 'demo.reviewer@xebia.com',
    initials: 'DR',
  });

  // Fetch logged in user context
  useEffect(() => {
    getContext()
      .then((ctx: IContext) => {
        if (ctx?.user?.fullName || ctx?.user?.userPrincipalName) {
          const name = ctx.user.fullName || ctx.user.userPrincipalName?.split('@')[0] || 'Demo Reviewer';
          const initials = name
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'DR';
          setCurrentUser({
            fullName: name,
            email: ctx.user.userPrincipalName || 'demo.reviewer@xebia.com',
            initials,
          });
        }
      })
      .catch((e: unknown) => console.warn('[Power Apps] getContext() not available in AppLayout:', e));
  }, []);

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
        height: '100vh',
        width: '100vw',
        maxWidth: '100vw',
        overflow: 'hidden',
        backgroundColor: '#F8F9FA',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#111827',
      }}
    >
      {/* SIDEBAR (Strictly non-scrollable, fixed full height) */}
      <aside
        style={{
          width: '230px',
          minWidth: '230px',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10,
          userSelect: 'none',
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

            {/* 2. New Screening / New Case */}
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
              <span>New Case</span>
            </NavLink>

            {/* 3. Screening Cases */}
            <NavLink
              to="/cases"
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
              <Files size={18} />
              <span>Cases</span>
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
      </aside>

      {/* MAIN CONTAINER */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* TOP BAR (Strictly non-scrollable, fixed height) */}
        <header
          style={{
            height: '56px',
            minHeight: '56px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
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
                  {currentUser.fullName}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }} title={currentUser.email}>
                  {currentUser.email.length > 24 ? `${currentUser.email.slice(0, 22)}...` : currentUser.email}
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
                {currentUser.initials}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY OUTLET (The only scrollable section) */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet context={{ openCopilot: () => setIsCopilotOpen(true) }} />
        </main>
      </div>

      {/* FLOATING CHATBOT AGENT BUTTON (Available on all pages) */}
      <button
        type="button"
        onClick={() => {
          setIsCopilotOpen((prev) => {
            if (!prev) {
              setIframeKey((k) => k + 1);
            }
            return !prev;
          });
        }}
        title={isCopilotOpen ? 'Close KYC assistant panel' : 'Chat with KYC Copilot Assistant'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 900,
          backgroundColor: '#831B84',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '9999px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(131, 27, 132, 0.42)',
          fontWeight: 600,
          fontSize: '13px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(131, 27, 132, 0.55)';
          e.currentTarget.style.backgroundColor = '#6e166f';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 18px rgba(131, 27, 132, 0.42)';
          e.currentTarget.style.backgroundColor = '#831B84';
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bot size={18} />
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22C55E',
              border: '1.5px solid #831B84',
            }}
          />
        </div>
        <span>{isCopilotOpen ? 'Close chat' : 'Chat with us'}</span>
      </button>

      {/* COPILOT STUDIO AGENT FLOATING CHATBOT WIDGET */}
      {isCopilotOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            width: '400px',
            maxWidth: 'calc(100vw - 32px)',
            height: '540px',
            maxHeight: 'calc(100vh - 110px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid #E5E7EB',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Drawer Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FAF4FB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#831B84',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(131, 27, 132, 0.25)',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                  KYC Copilot Assistant
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#16A34A',
                      display: 'inline-block',
                    }}
                  />
                  <span>Copilot Studio · Active</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIframeKey((prev) => prev + 1)}
                title="Reload chat session"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE0EE')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCcw size={15} />
              </button>

              <button
                type="button"
                onClick={() => setIsCopilotOpen(false)}
                title="Close side panel"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE0EE')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Copilot Studio Live WebChat Iframe (default teal header masked via overflow clipping) */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >
            <iframe
              key={iframeKey}
              src="https://copilotstudio.microsoft.com/environments/d342b729-49aa-ebca-8ede-9a148dc57d52/bots/cr665_KYCCopilotAssistant/webchat?__version__=2&enableFileAttachment=false"
              title="KYC Copilot Assistant"
              frameBorder="0"
              style={{
                position: 'absolute',
                top: '-50px',
                left: 0,
                width: '100%',
                height: 'calc(100% + 50px)',
                border: 0,
                display: 'block',
              }}
              allow="clipboard-read; clipboard-write; microphone"
            />
          </div>
        </div>
      )}
    </div>
  );
};
