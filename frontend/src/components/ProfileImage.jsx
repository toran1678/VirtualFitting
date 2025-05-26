import { getProfileImageUrl, handleImageError } from "../utils/imageUtils"

const ProfileImage = ({ profilePicture, nickname, size = "medium", className = "", showFallback = true }) => {
  const sizeClasses = {
    small: "w-8 h-8 text-sm",
    medium: "w-12 h-12 text-base",
    large: "w-16 h-16 text-lg",
    xlarge: "w-24 h-24 text-xl",
  }

  const imageUrl = getProfileImageUrl(profilePicture)

  if (imageUrl) {
    return (
      <img
        src={imageUrl || "/placeholder.svg"}
        alt={`${nickname || "사용자"}의 프로필`}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
        onError={(e) => handleImageError(e, "/placeholder.svg?height=60&width=60&query=user profile")}
      />
    )
  }

  if (showFallback) {
    return (
      <div
        className={`rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold ${sizeClasses[size]} ${className}`}
      >
        {nickname?.charAt(0)?.toUpperCase() || "U"}
      </div>
    )
  }

  return null
}

export default ProfileImage
