import { useEffect, useRef, useState } from 'react';
import SettingsPanel from './SettingsPanel';
import SettingsButton from './SettingsButton';
import {
  AvatarPlaceholderIcon,
  SettingsCameraHeaderIcon,
} from '../icons/SettingsIcons';
import { useUser } from '../../context/UserContext';

export default function ChangePhotoPanel() {
  const { avatarUrl, saveAvatar } = useUser();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setMessage('');
    setError('');

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    setMessage('');
    setError('');

    if (!selectedFile) {
      setError('Choose a profile photo first.');
      return;
    }

    setSubmitting(true);
    const result = await saveAvatar(selectedFile);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage('Profile photo updated successfully.');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const displayAvatarUrl = previewUrl || avatarUrl;

  return (
    <SettingsPanel
      icon={<SettingsCameraHeaderIcon />}
      title="Change My Photo"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div
          className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 sm:mx-0"
          aria-hidden="true"
        >
          {displayAvatarUrl ? (
            <img
              src={displayAvatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <AvatarPlaceholderIcon className="h-12 w-12 text-gray-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={fileInputRef}
            id="photo-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileChange}
          />
          <label htmlFor="photo-file" className="sr-only">
            Choose profile photo
          </label>
          <input
            type="text"
            readOnly
            value={selectedFile?.name || ''}
            placeholder=""
            onClick={handleChooseFile}
            className="mb-3 w-full cursor-pointer rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors duration-200 focus:border-lion-settings-accent focus:outline-none focus:ring-2 focus:ring-lion-settings-accent/30"
          />
          <div className="flex flex-wrap gap-3">
            <SettingsButton
              variant="yellow"
              type="button"
              onClick={selectedFile ? handleUpload : handleChooseFile}
              disabled={submitting}
            >
              {submitting ? 'Uploading...' : 'Change'}
            </SettingsButton>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}

          {message ? (
            <p role="status" className="mt-3 text-sm font-medium text-green-700">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </SettingsPanel>
  );
}
