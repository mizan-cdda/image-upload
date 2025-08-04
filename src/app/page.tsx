'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface UploadedImage {
  id: string;
  url: string;
  publicId: string;
  originalName: string;
  uploadedAt: Date;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export default function ImageUploadPage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all images from Cloudinary
  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/images?folder=gallery');
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      
      const data = await response.json();
      const formattedImages: UploadedImage[] = data.images.map((img: any) => ({
        id: img.public_id,
        url: img.secure_url,
        publicId: img.public_id,
        originalName: img.original_filename || img.public_id.split('/').pop() || 'Unknown',
        uploadedAt: new Date(img.created_at),
        width: img.width,
        height: img.height,
        format: img.format,
        bytes: img.bytes,
      }));
      
      setImages(formattedImages);
    } catch (error) {
      console.error('Error fetching images:', error);
      alert('Failed to load images. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Load images on component mount
  useEffect(() => {
    fetchImages();
  }, []);

  const uploadToCloudinary = async (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    
    return {
      id: data.public_id,
      url: data.secure_url,
      publicId: data.public_id,
      originalName: file.name,
      uploadedAt: new Date(data.created_at),
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadPromises: Promise<UploadedImage>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        uploadPromises.push(uploadToCloudinary(file));
      }
    }

    try {
      await Promise.all(uploadPromises);
      // Refresh the image list from Cloudinary after upload
      await fetchImages();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copied to clipboard!');
    } catch (error) {
      console.error('Copy failed:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URL copied to clipboard!');
    }
  };

  const filteredImages = images.filter(image =>
    image.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    image.publicId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getImageDimensions = (image: UploadedImage) => {
    if (image.width && image.height) {
      return `${image.width} × ${image.height}`;
    }
    return 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Image Upload & Gallery
          </h1>
          <p className="text-gray-600">
            Upload images to Cloudinary and manage your gallery
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="text-6xl text-gray-400">📸</div>
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop images here or click to upload
                </p>
                <p className="text-sm text-gray-500">
                  Support multiple files (PNG, JPG, GIF, WebP)
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                {uploading ? 'Uploading...' : 'Choose Files'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Uploading images...</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Loading images from Cloudinary...</span>
            </div>
          </div>
        )}

        {/* Image Gallery */}
        {!loading && images.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">
                All Images ({filteredImages.length} of {images.length})
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                </div>
                
                {/* View Toggle */}
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 text-sm font-medium ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 text-sm font-medium ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            {filteredImages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No images match your search</p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  /* Grid View */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredImages.map((image) => (
                      <div
                        key={image.id}
                        className="bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-square">
                          <Image
                            src={image.url}
                            alt={image.originalName}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-gray-900 truncate mb-1">
                            {image.originalName}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            {image.format?.toUpperCase()} • {formatFileSize(image.bytes)}
                          </p>
                          <p className="text-xs text-gray-500 mb-3">
                            {image.uploadedAt.toLocaleDateString()} • {getImageDimensions(image)}
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => copyToClipboard(image.url)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded transition-colors"
                            >
                              Copy URL
                            </button>
                            <button
                              onClick={() => window.open(image.url, '_blank')}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-3 rounded transition-colors"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List View */
                  <div className="space-y-2">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <div className="col-span-1">Preview</div>
                      <div className="col-span-3">Name</div>
                      <div className="col-span-2">Public ID</div>
                      <div className="col-span-2">Upload Date</div>
                      <div className="col-span-2">URL</div>
                      <div className="col-span-2">Actions</div>
                    </div>
                    {filteredImages.map((image) => (
                      <div
                        key={image.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="sm:col-span-1">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                            <Image
                              src={image.url}
                              alt={image.originalName}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <p className="font-medium text-gray-900 mb-1">
                            {image.originalName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {image.format?.toUpperCase()} • {formatFileSize(image.bytes)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getImageDimensions(image)}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-sm text-gray-700 font-mono break-all">
                            {image.publicId}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-sm text-gray-700">
                            {image.uploadedAt.toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {image.uploadedAt.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={image.url}
                              readOnly
                              className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1 truncate"
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-2 flex flex-wrap gap-1">
                          <button
                            onClick={() => copyToClipboard(image.url)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => window.open(image.url, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && images.length === 0 && !uploading && (
          <div className="text-center py-12">
            <div className="text-4xl text-gray-400 mb-4">🖼️</div>
            <p className="text-gray-500">No images found in Cloudinary</p>
            <p className="text-sm text-gray-400 mt-2">Upload some images to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}