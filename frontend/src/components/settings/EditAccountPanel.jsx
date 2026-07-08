import { useEffect, useState } from 'react';
import SettingsPanel from './SettingsPanel';
import SettingsButton from './SettingsButton';
import SettingsTextField from './SettingsTextField';
import ChangePasswordModal from './ChangePasswordModal';
import { SettingsEditHeaderIcon } from '../icons/SettingsIcons';
import { useUser } from '../../context/UserContext';

function validateName(value) {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (trimmed.length > 80) {
    return 'Name must be 80 characters or fewer.';
  }
  return '';
}

function validateUsername(value) {
  const trimmed = value.trim();
  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters.';
  }
  if (trimmed.length > 30) {
    return 'Username must be 30 characters or fewer.';
  }
  if (!/^[A-Za-z0-9_]+$/.test(trimmed)) {
    return 'Username may only contain letters, numbers, and underscores.';
  }
  return '';
}

export default function EditAccountPanel() {
  const { profile, saveProfile } = useUser();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(profile?.name || '');
    setUsername(profile?.username || '');
  }, [profile?.name, profile?.username]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    setSubmitting(true);
    const result = await saveProfile({ name: name.trim(), username: username.trim() });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage('Account updated successfully.');
  };

  return (
    <>
      <SettingsPanel
        icon={<SettingsEditHeaderIcon />}
        title="Edit My Account"
      >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <SettingsTextField
          id="account-name"
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <SettingsTextField
          id="account-username"
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
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

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <SettingsButton variant="blue" type="submit" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update'}
          </SettingsButton>
          <SettingsButton
            variant="pink"
            type="button"
            onClick={() => setPasswordModalOpen(true)}
          >
            Change Password
          </SettingsButton>
        </div>
      </form>
      </SettingsPanel>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}
