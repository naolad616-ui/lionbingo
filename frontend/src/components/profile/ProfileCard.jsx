import { CameraIcon } from '../icons/ProfileIcons';

export default function ProfileCard({ displayName = 'Abraham', avatarUrl = null }) {
  return (
    <article className="w-full max-w-[430px] overflow-hidden rounded-sm bg-lion-profile-coral shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
      <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 sm:min-h-[240px] sm:px-8 sm:py-12 md:min-h-[250px]">
        <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm sm:h-40 sm:w-40 md:h-[168px] md:w-[168px]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <CameraIcon className="h-9 w-9 text-gray-300 sm:h-10 sm:w-10" />
          )}
        </div>

        <h2 className="mt-5 text-xl font-normal text-gray-900 sm:mt-6 sm:text-[1.35rem]">
          {displayName}
        </h2>
      </div>
    </article>
  );
}
