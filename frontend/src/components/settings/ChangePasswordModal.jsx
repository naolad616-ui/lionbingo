import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SettingsButton from './SettingsButton';
import SettingsTextField from './SettingsTextField';
import { useUser } from '../../context/UserContext';

export default function ChangePasswordModal({ open, onClose }) {
  const { savePassword, passwordIsSet } = useUser();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
    setSubmitting(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('New password and confirmation are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (passwordIsSet && !oldPassword) {
      setError('Old password is required.');
      return;
    }

    setSubmitting(true);
    const result = await savePassword({
      ...(passwordIsSet ? { oldPassword } : {}),
      newPassword,
      confirmPassword,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage(result.message);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 sm:items-center sm:py-10">
          <button
            type="button"
            aria-label="Close change password dialog"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-[1] w-full max-w-[420px] rounded-sm border border-gray-200 bg-white px-5 py-6 shadow-[0_8px_28px_rgba(0,0,0,0.22)] sm:px-6 sm:py-7"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="change-password-title"
              className="mb-6 text-center text-lg font-normal text-gray-800 sm:text-xl"
            >
              Change your password
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              aria-label="Change password form"
            >
              {passwordIsSet ? (
                <SettingsTextField
                  id="modal-old-password"
                  label="Old password"
                  type="password"
                  labelClassName="font-bold text-gray-900"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  placeholder="Old password"
                  autoComplete="current-password"
                />
              ) : null}

              <SettingsTextField
                id="modal-new-password"
                label="New password"
                type="password"
                labelClassName="font-bold text-gray-900"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
              />

              <SettingsTextField
                id="modal-confirm-password"
                label="Confirm new password"
                type="password"
                labelClassName="font-bold text-gray-900"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />

              {error ? (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {error}
                </p>
              ) : null}

              {message ? (
                <p role="status" className="text-sm font-medium text-green-700">
                  {message}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <SettingsButton variant="blue" type="submit" disabled={submitting}>
                  {submitting ? 'Changing...' : 'Change'}
                </SettingsButton>
                <SettingsButton variant="pink" type="button" onClick={onClose} disabled={submitting}>
                  Cancel
                </SettingsButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
