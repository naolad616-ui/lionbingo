import { Link } from 'react-router-dom';
import { EditProfileIcon } from '../icons/ProfileIcons';

export default function EditProfileLink({ href = '#', onClick }) {
  const className =
    'group inline-flex items-center gap-1.5 text-sm text-gray-800 transition-colors duration-200 hover:text-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lion-red sm:text-[15px]';

  const content = (
    <>
      <EditProfileIcon className="h-4 w-4 text-gray-700 transition-colors duration-200 group-hover:text-gray-900" />
      <span className="underline-offset-2 group-hover:underline">Edit profile</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {content}
    </a>
  );
}
