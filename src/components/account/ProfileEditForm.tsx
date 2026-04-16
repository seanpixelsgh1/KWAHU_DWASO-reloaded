"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";

interface ProfileEditFormProps {
  profile: {
    name: string;
    email: string;
    phone: string;
    image: string;
  };
  onSubmit: (updatedProfile: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ProfileEditForm({
  profile,
  onSubmit,
  onCancel,
  loading = false,
}: ProfileEditFormProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    ...profile,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is using OAuth (no password needed) - can be detected by checking if they have an image from provider
  const isOAuthUser =
    session?.user?.image?.includes("googleusercontent") ||
    session?.user?.image?.includes("github") ||
    false;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Canvas to Blob conversion failed"));
              }
            },
            "image/jpeg",
            0.8 // Quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preliminary validation
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Please select an image file" }));
      return;
    }

    setImageUploading(true);
    setErrors((prev) => ({ ...prev, image: "" }));

    try {
      let fileToUpload: Blob = file;

      // Compress if over 1MB
      if (file.size > 1024 * 1024) {
        console.log("Compressing image...");
        try {
          fileToUpload = await compressImage(file);
          console.log(`Compressed from ${file.size} to ${fileToUpload.size} bytes`);
        } catch (compErr) {
          console.error("Compression failed, attempting original upload:", compErr);
        }
      }

      const formDataUpload = new FormData();
      formDataUpload.append("image", fileToUpload, "profile.jpg");
      formDataUpload.append("email", formData.email);
      formDataUpload.append("type", "profile");

      const res = await fetch("/api/user/upload-image", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, image: data.imageUrl }));
      } else {
        setErrors((prev) => ({
          ...prev,
          image: data.details || data.error || "Failed to upload image",
        }));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrors((prev) => ({ 
        ...prev, 
        image: err.message || "Network error during upload" 
      }));
    } finally {
      setImageUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Password validation (only if trying to update password)
    if (
      showPasswordSection ||
      formData.newPassword ||
      formData.currentPassword
    ) {
      if (!isOAuthUser && !formData.currentPassword.trim()) {
        newErrors.currentPassword = "Current password is required";
      }

      if (formData.newPassword) {
        if (formData.newPassword.length < 6) {
          newErrors.newPassword = "New password must be at least 6 characters";
        }

        if (formData.newPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
        }
      }

      if (formData.confirmPassword && !formData.newPassword) {
        newErrors.newPassword = "New password is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Image Section */}
      <div className="text-center">
        <div className="relative inline-block">
          {formData.image ? (
            <img
              src={formData.image}
              alt="Profile"
              className="w-[120px] h-[120px] rounded-full object-cover border-4 border-gray-200"
            />
          ) : (
            <div className="w-[120px] h-[120px] bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-500 text-sm">No Image</span>
            </div>
          )}
          {imageUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <svg
                className="animate-spin h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                ></circle>
                <path
                  fill="currentColor"
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}
        </div>

        <div className="mt-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {imageUploading ? "Uploading..." : "Change Picture"}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            JPG, GIF or PNG. Max size 5MB.
          </p>
          {errors.image && (
            <p className="text-red-500 text-sm mt-1">{errors.image}</p>
          )}
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-theme-color ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter your full name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
          disabled
          readOnly
        />
        <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-theme-color ${
            errors.phone ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter your phone number"
        />
        {errors.phone && (
          <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
        )}
      </div>

      {/* Password Section */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Password Settings
          </h3>
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            {showPasswordSection ? "Cancel" : "Change Password"}
          </button>
        </div>

        {showPasswordSection && (
          <div className="space-y-4">
            {isOAuthUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">OAuth User:</span> You&apos;re
                  signed in with a social account. You can set a password to
                  enable email/password login as well.
                </p>
              </div>
            )}

            {!isOAuthUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password *
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-theme-color ${
                    errors.currentPassword
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  placeholder="Enter your current password"
                />
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.currentPassword}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password *
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-theme-color ${
                  errors.newPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter new password (min. 6 characters)"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.newPassword}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-theme-color ${
                  errors.confirmPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Confirm your new password"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-theme-color text-white rounded-md hover:bg-theme-color/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="opacity-25"
                ></circle>
                <path
                  fill="currentColor"
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Updating...
            </span>
          ) : (
            "Update Profile"
          )}
        </button>
      </div>
    </form>
  );
}
