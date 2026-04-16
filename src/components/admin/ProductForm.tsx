"use client";

import { useState, useEffect } from "react";
import { 
  FiPackage, 
  FiFileText, 
  FiDollarSign, 
  FiLayers, 
  FiImage, 
  FiUploadCloud, 
  FiLink, 
  FiInfo,
  FiAlertCircle,
  FiCheckCircle
} from "react-icons/fi";

import { toast } from "react-hot-toast";

const CATEGORIES = [
  "Agriculture",
  "Groceries",
  "Crafts",
  "Fashion",
  "Electronics"
];

// Helper function for image URL validation
function isValidImageUrl(url: string) {
  return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(url);
}

export default function ProductForm() {
  // 1. Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
  });

  // 2. Media State
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // 3. Status State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 4. Handle Preview Updates
  useEffect(() => {
    if (imageMode === "url") {
      if (imageUrl && imageUrl.startsWith("http")) {
        setPreview(imageUrl);
      } else {
        setPreview(null);
      }
    }
  }, [imageUrl, imageMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size exceeds 2MB limit");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed");
        return;
      }
      setSelectedFile(file);
      setError(null);
      
      // Create local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Cleanup function for object URL
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", stock: "", category: "" });
    setImageUrl("");
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 1. Client-Side Validation
    if (!formData.name.trim()) return setError("Product name is required");
    if (!formData.category) return setError("Please select a category");
    
    const numericPrice = Number(formData.price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return setError("Please enter a valid positive price");
    }

    // Comprehensive Image Validation
    if (!selectedFile && !imageUrl.trim()) {
      return setError("Please upload an image or provide an image URL");
    }

    if (imageUrl.trim() && !isValidImageUrl(imageUrl)) {
      return setError("Invalid image URL. Must be a direct link (jpg, jpeg, png, webp)");
    }

    if (imageMode === "url" && !imageUrl.trim()) {
      return setError("Image URL is required in URL mode");
    }

    if (imageMode === "upload" && !selectedFile) {
      return setError("Please select an image file to upload");
    }

    const toastId = toast.loading("Processing product...");
    setLoading(true);

    try {
      let finalImageUrl = "";
      let finalImagePath = null;

      // 2. Step 1: Handle Hybrid Image Sourcing
      if (selectedFile) {
        // Mode: Upload
        toast.loading("Uploading product image...", { id: toastId });
        const uploadData = new FormData();
        uploadData.append("image", selectedFile);
        uploadData.append("type", "product"); // Use standardized type

        const uploadRes = await fetch("/api/user/upload-image", {
          method: "POST",
          body: uploadData,
        });

        if (!uploadRes.ok) {
          const uploadError = await uploadRes.json();
          throw new Error(uploadError.error || "Image upload failed");
        }

        const uploadResult = await uploadRes.json();
        finalImageUrl = uploadResult.imageUrl;
        finalImagePath = uploadResult.path;
      } else if (imageUrl.trim()) {
        // Mode: URL
        finalImageUrl = imageUrl.trim();
      }

      // Safeguard: Ensure we have a URL by now
      if (!finalImageUrl) {
        throw new Error("Please upload an image or provide an image URL");
      }

      // 3. Step 2: Create Product in Firestore
      toast.loading("Saving product details...", { id: toastId });
      const productPayload = {
        ...formData,
        images: [finalImageUrl],
        imageSource: selectedFile ? "upload" : "url",
        imagePath: finalImagePath, // Atomic-safe metadata
      };

      const productRes = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload),
      });

      if (!productRes.ok) {
        const productError = await productRes.json();
        throw new Error(productError.error || "Failed to create product");
      }

      // 4. Success Handling
      toast.success("Product created successfully!", { id: toastId });
      resetForm();
    } catch (err) {
      console.error("Submission Error:", err);
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center mb-8 pb-4 border-b border-gray-100">
        <FiPackage className="text-3xl text-indigo-600 mr-4" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
          <p className="text-sm text-gray-500">Create a production-grade listing for Kwahu Dwaso</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Display */}
        {error && (
          <div className="flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
            <FiAlertCircle className="text-red-500 mr-3 h-5 w-5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Section 1: Basic Information */}
        <div className="bg-gray-50 p-6 rounded-lg space-y-6">
          <div className="flex items-center text-gray-800 font-semibold mb-2">
            <FiInfo className="mr-2 text-indigo-500" />
            <h3>Basic Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                Product Name <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <FiFileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Kwahu Tiger Nuts"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                Category <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <FiLayers className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
                  required
                >
                  <option value="">Select a Category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Provide detailed information about the product..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none"
            />
          </div>
        </div>

        {/* Section 2: Pricing & Stock */}
        <div className="bg-indigo-50/30 border border-indigo-100 p-6 rounded-lg space-y-6">
          <div className="flex items-center text-gray-800 font-semibold mb-2">
            <FiDollarSign className="mr-2 text-indigo-500" />
            <h3>Pricing & Stock</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Price (GH₵) <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Stock Quantity</label>
              <div className="relative">
                <FiPackage className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Media Management */}
        <div className="border border-gray-200 p-6 rounded-lg space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-gray-800 font-semibold">
              <FiImage className="mr-2 text-indigo-500" />
              <h3>Media Management</h3>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => { setImageMode("upload"); setError(null); }}
                className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  imageMode === "upload" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <FiUploadCloud className="mr-2" /> Upload
              </button>
              <button
                type="button"
                onClick={() => { setImageMode("url"); setError(null); }}
                className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  imageMode === "url" 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <FiLink className="mr-2" /> URL
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              {imageMode === "upload" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Upload Product Image</label>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiUploadCloud className="text-4xl text-gray-400 mb-3" />
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG or WEBP (Max 2MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange} 
                    />
                  </label>
                  {selectedFile && (
                    <div className="flex items-center text-xs text-green-600 mt-2">
                      <FiCheckCircle className="mr-1" /> {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Direct Image URL</label>
                  <div className="relative">
                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => { setImageUrl(e.target.value); setError(null); }}
                      placeholder="https://example.com/image.jpg"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 italic">Provide a link to an image hosted on an external CDN or Marketplace.</p>
                </div>
              )}
            </div>

            {/* Preview Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Image Preview</label>
              <div className="h-40 w-full rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden relative group">
                {preview ? (
                  <img 
                    src={preview} 
                    alt="Product Preview" 
                    className="h-full w-full object-cover transition-transform group-hover:scale-105" 
                  />
                ) : (
                  <div className="text-center text-gray-400 p-4">
                    <FiImage className="text-3xl mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No media selected</p>
                  </div>
                )}
                {preview && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {imageMode.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? "Validating..." : "Validate Product Details"}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({ name: "", description: "", price: "", stock: "", category: "" });
              setImageUrl("");
              setSelectedFile(null);
              setPreview(null);
              setError(null);
            }}
            className="px-6 py-3 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset Form
          </button>
        </div>
      </form>
    </div>
  );
}
