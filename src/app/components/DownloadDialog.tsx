import React from 'react';
import Button from './Button';

interface DownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageCount: number;
  onStartNewBundle: () => void;
  onContinueEditing: () => void;
  hasAppliedChanges: boolean;
  appliedPresetName?: string;
  isDownloading: boolean;
  downloadComplete: boolean;
  formatType: string;
}

export default function DownloadDialog({
  isOpen,
  onClose,
  imageCount,
  onStartNewBundle,
  onContinueEditing,
  hasAppliedChanges,
  appliedPresetName,
  isDownloading,
  downloadComplete,
  formatType
}: DownloadDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="brutalist-border w-full max-w-md bg-white p-0">
        <div className="bg-black text-white p-3 font-bold uppercase flex justify-between items-center">
          <span>{downloadComplete ? 'Download Complete' : 'Download Images'}</span>
          {downloadComplete && (
            <button 
              onClick={onContinueEditing}
              className="text-white hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="p-6">
          {!downloadComplete ? (
            <>
              <h3 className="text-xl font-bold mb-4 uppercase">Confirm Download</h3>
              
              <div className="space-y-4 mb-6">
                <div className="brutalist-border p-3 bg-slate-50">
                  <p className="font-bold mb-2">Download Summary:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><span className="font-bold">{imageCount}</span> {imageCount === 1 ? 'image' : 'images'} will be downloaded</li>
                    <li>Format: <span className="font-bold uppercase">{formatType}</span></li>
                    {hasAppliedChanges && appliedPresetName && (
                      <li>Applied preset: <span className="font-bold">{appliedPresetName}</span></li>
                    )}
                    {hasAppliedChanges && (
                      <li>Image adjustments have been applied</li>
                    )}
                    <li>Files will be packaged as a <span className="font-bold">ZIP archive</span></li>
                  </ul>
                </div>
                
                <p className="text-sm text-gray-600">
                  Processing may take a moment for multiple or large images.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={onContinueEditing} 
                  className="mr-2"
                  variant="secondary"
                  disabled={isDownloading}
                >
                  CANCEL
                </Button>
                <Button 
                  onClick={onClose}
                  variant="accent"
                  disabled={isDownloading}
                >
                  {isDownloading ? 'PROCESSING...' : 'DOWNLOAD'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-4 uppercase">Download Successful</h3>
              
              <div className="space-y-4 mb-6">
                <p>Your images have been successfully downloaded. What would you like to do next?</p>
                
                <div className="brutalist-border p-3 bg-slate-50">
                  <ul className="list-disc pl-5">
                    <li><span className="font-bold">Start new bundle:</span> Clear current images and start fresh</li>
                    <li><span className="font-bold">Continue editing:</span> Keep working with current images</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button 
                  onClick={onStartNewBundle}
                  variant="secondary"
                >
                  START NEW BUNDLE
                </Button>
                <Button 
                  onClick={onContinueEditing}
                  variant="accent"
                >
                  CONTINUE EDITING
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 