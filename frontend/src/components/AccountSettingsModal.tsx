import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../api/client';
import { useModalStore } from '../store/modal';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user, login } = useAuthStore();
  const { showSuccess, showError } = useModalStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Profile Edit State
  const [name, setName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccessMessage, setPassSuccessMessage] = useState('');
  const [passErrorMessage, setPassErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setPassSuccessMessage('');
      setPassErrorMessage('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsEditingName(false);

      setLoadingProfile(true);
      fetchApi('/auth/profile')
        .then(res => {
          setProfileData(res.data);
          if (res.data?.name) setName(res.data.name);
        })
        .catch(err => {
          console.error('Failed to load profile:', err);
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const res = await fetchApi('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim() })
      });
      // Update local storage and auth store
      const token = localStorage.getItem('token') || '';
      login({ ...user, name: res.data.name }, token);
      setIsEditingName(false);
      showSuccess('Profile name updated successfully!', { title: 'NAME UPDATED' });
    } catch (err: any) {
      showError(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccessMessage('');
    setPassErrorMessage('');

    if (!currentPassword) {
      setPassErrorMessage('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPassErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMessage('New passwords do not match.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await fetchApi('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      setPassSuccessMessage(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassErrorMessage(err.message || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  const memberSince = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
        day: 'numeric'
      })
    : 'Recent Member';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-settings-title"
    >
      <div
        className="relative w-full max-w-xl bg-surface border-4 border-on-background shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-on-background text-on-primary px-6 py-4 flex items-center justify-between border-b-4 border-on-background">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-fixed text-3xl font-black">
              manage_accounts
            </span>
            <div>
              <h2 id="account-settings-title" className="font-headline-lg text-2xl uppercase tracking-tight font-black text-primary-fixed">
                Account Settings
              </h2>
              <p className="font-mono text-xs text-neutral-300 uppercase tracking-wider">
                Manage profile credentials & security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-primary-fixed text-on-background border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 transition-all"
            aria-label="Close settings"
          >
            <span className="material-symbols-outlined text-xl font-black">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-4 border-on-background bg-slate-100">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-4 font-headline-lg text-sm sm:text-base uppercase font-black flex items-center justify-center gap-2 border-r-2 border-on-background transition-all ${
              activeTab === 'profile'
                ? 'bg-primary-fixed text-on-background border-b-4 border-b-black -mb-1 z-10'
                : 'text-neutral-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">person</span>
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 px-4 font-headline-lg text-sm sm:text-base uppercase font-black flex items-center justify-center gap-2 transition-all ${
              activeTab === 'security'
                ? 'bg-primary-fixed text-on-background border-b-4 border-b-black -mb-1 z-10'
                : 'text-neutral-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">lock_reset</span>
            Password & Security
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-surface">
          {loadingProfile ? (
            <div className="py-12 text-center">
              <span className="font-mono text-sm uppercase font-bold text-neutral-600 animate-pulse">
                Loading Account Data...
              </span>
            </div>
          ) : activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Account Identity Card */}
              <div className="bg-white border-3 border-on-background p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="font-mono text-[11px] font-black uppercase text-neutral-500 tracking-wider block">
                      VERIFIED ACCOUNT ID
                    </span>
                    <span className="font-mono text-xs font-bold text-neutral-800 break-all">
                      {user.id}
                    </span>
                  </div>
                  <span className="bg-primary-fixed text-on-background border-2 border-black font-mono text-xs font-black px-3 py-1 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {user.role}
                  </span>
                </div>

                {/* Name Row with inline edit */}
                <div className="border-t-2 border-slate-200 pt-4 mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-data-label text-xs font-bold uppercase text-neutral-600">Full Name</span>
                    {!isEditingName && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="font-mono text-xs font-bold text-neutral-900 underline hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Edit
                      </button>
                    )}
                  </div>
                  {isEditingName ? (
                    <form onSubmit={handleUpdateName} className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="flex-1 bg-slate-50 border-2 border-black px-3 py-1.5 font-bold text-sm focus:bg-yellow-50 focus:outline-none"
                        required
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={savingName}
                        className="bg-primary-fixed text-on-background border-2 border-black px-4 py-1.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300"
                      >
                        {savingName ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setName(user.name);
                          setIsEditingName(false);
                        }}
                        className="bg-slate-200 text-black border-2 border-black px-3 py-1.5 font-bold text-xs uppercase hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <p className="font-headline-lg text-lg font-black text-on-surface uppercase">
                      {user.name}
                    </p>
                  )}
                </div>

                {/* Email Row */}
                <div className="border-t-2 border-slate-200 pt-4 mb-4">
                  <span className="font-data-label text-xs font-bold uppercase text-neutral-600 block mb-1">
                    Registered Email Address
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm sm:text-base font-black text-neutral-900 break-all">
                      {user.email}
                    </span>
                    <span className="bg-green-100 text-green-800 border-2 border-green-800 font-mono text-[10px] font-black px-2 py-0.5 uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <span className="material-symbols-outlined text-xs font-black">verified</span>
                      VERIFIED
                    </span>
                  </div>
                </div>

                {/* Member Details */}
                <div className="border-t-2 border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-neutral-600">
                  <span>Joined Seatzy: <strong>{memberSince}</strong></span>
                  {profileData?.total_bookings !== undefined && (
                    <span>Total Bookings: <strong>{profileData.total_bookings}</strong></span>
                  )}
                  {profileData?.total_events !== undefined && user.role === 'organiser' && (
                    <span>Events Managed: <strong>{profileData.total_events}</strong></span>
                  )}
                </div>
              </div>

              {/* Quick Info Banner */}
              <div className="bg-yellow-50 border-2 border-black p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-yellow-700 text-2xl font-black shrink-0 mt-0.5">
                  info
                </span>
                <p className="text-xs text-neutral-800 font-medium leading-relaxed">
                  Your email is linked to all your ticket bookings and digital gate passes. You can access your confirmed admission passes from any device by signing in with this email.
                </p>
              </div>
            </div>
          ) : (
            /* Password & Security Tab */
            <form onSubmit={handleChangePassword} className="space-y-5">
              {passSuccessMessage && (
                <div className="bg-green-100 border-3 border-green-800 p-4 shadow-[4px_4px_0px_0px_rgba(22,101,52,1)] flex items-start gap-3 animate-fadeIn">
                  <span className="material-symbols-outlined text-green-800 text-2xl font-black shrink-0">
                    check_circle
                  </span>
                  <div>
                    <h4 className="font-headline-lg text-sm font-black uppercase text-green-950">
                      SUCCESS
                    </h4>
                    <p className="text-xs font-bold text-green-900 mt-0.5">
                      {passSuccessMessage}
                    </p>
                  </div>
                </div>
              )}

              {passErrorMessage && (
                <div className="bg-red-100 border-3 border-red-800 p-4 shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] flex items-start gap-3 animate-fadeIn">
                  <span className="material-symbols-outlined text-red-800 text-2xl font-black shrink-0">
                    error
                  </span>
                  <div>
                    <h4 className="font-headline-lg text-sm font-black uppercase text-red-950">
                      PASSWORD ERROR
                    </h4>
                    <p className="text-xs font-bold text-red-900 mt-0.5">
                      {passErrorMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block font-data-label text-xs font-black uppercase text-on-surface mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full bg-white border-2 border-on-background px-3 py-2.5 font-bold text-sm focus:bg-yellow-50 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-black"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showCurrentPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block font-data-label text-xs font-black uppercase text-on-surface mb-1">
                  New Password (min. 6 characters) *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full bg-white border-2 border-on-background px-3 py-2.5 font-bold text-sm focus:bg-yellow-50 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-black"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showNewPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block font-data-label text-xs font-black uppercase text-on-surface mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-white border-2 border-on-background px-3 py-2.5 font-bold text-sm focus:bg-yellow-50 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="w-full bg-primary-fixed text-on-background font-headline-lg text-base uppercase font-black py-3 border-3 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined font-black">save</span>
                  <span>{changingPass ? 'UPDATING PASSWORD...' : 'UPDATE PASSWORD'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t-4 border-on-background px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-xs text-neutral-500 font-bold">
            SEATZY ACCOUNT CONSOLE
          </span>
          <button
            onClick={onClose}
            className="bg-white text-black border-2 border-black px-4 py-1.5 font-headline-lg text-xs uppercase font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
