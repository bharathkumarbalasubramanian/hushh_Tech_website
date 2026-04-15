/**
 * NDA Service
 * Handles all NDA-related API calls for the global NDA gate feature
 */

import config from '../../resources/config/config';
import { getNdaGenerationUrl } from '../runtime/mainWeb';

// Supabase function URL for NDA notification
const NDA_NOTIFICATION_FUNCTION_URL = `${config.SUPABASE_URL}/functions/v1/nda-signed-notification`;

export interface NDAStatus {
  hasSignedNda: boolean;
  signedAt: string | null;
  ndaVersion: string | null;
  signerName: string | null;
}

export interface SignNDAResult {
  success: boolean;
  signedAt?: string;
  signerName?: string;
  ndaVersion?: string;
  error?: string;
}

/**
 * Check if the current user has signed the NDA
 */
export const checkNDAStatus = async (userId: string): Promise<NDAStatus> => {
  try {
    if (!config.supabaseClient) {
      console.error('Supabase client not initialized');
      return {
        hasSignedNda: false,
        signedAt: null,
        ndaVersion: null,
        signerName: null,
      };
    }
    
    const { data, error } = await config.supabaseClient
      .rpc('check_user_nda_status', { p_user_id: userId });
    
    if (error) {
      console.error('Error checking NDA status:', error);
      return {
        hasSignedNda: false,
        signedAt: null,
        ndaVersion: null,
        signerName: null,
      };
    }
    
    return data as NDAStatus;
  } catch (err) {
    console.error('Error in checkNDAStatus:', err);
    return {
      hasSignedNda: false,
      signedAt: null,
      ndaVersion: null,
      signerName: null,
    };
  }
};

/**
 * Sign the global NDA
 */
export const signNDA = async (
  signerName: string,
  ndaVersion: string = 'v1.0',
  pdfUrl?: string
): Promise<SignNDAResult> => {
  try {
    if (!config.supabaseClient) {
      console.error('Supabase client not initialized');
      return {
        success: false,
        error: 'Supabase client not initialized',
      };
    }
    
    // Avoid browser-side IP discovery so NDA signing does not depend on extra CSP hosts.
    const signerIp = 'unknown';
    
    const { data, error } = await config.supabaseClient
      .rpc('sign_global_nda', {
        p_signer_name: signerName,
        p_nda_version: ndaVersion,
        p_pdf_url: pdfUrl || null,
        p_signer_ip: signerIp,
      });
    
    if (error) {
      console.error('Error signing NDA:', error);
      return {
        success: false,
        error: error.message,
      };
    }
    
    return data as SignNDAResult;
  } catch (err) {
    console.error('Error in signNDA:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Generate personalized NDA PDF using Cloud Run service
 */
export const generateNDAPdf = async (
  metadata: Record<string, unknown>,
  accessToken: string
): Promise<{ success: boolean; pdfUrl?: string; blob?: Blob; error?: string }> => {
  try {
    const response = await fetch(
      getNdaGenerationUrl(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'jwt-token': accessToken,
        },
        body: JSON.stringify({ metadata }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to generate PDF: ${errorText}`,
      };
    }
    
    const blob = await response.blob();
    const pdfUrl = URL.createObjectURL(blob);
    
    return {
      success: true,
      pdfUrl,
      blob,
    };
  } catch (err) {
    console.error('Error generating NDA PDF:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Send NDA signed notification to manish@hushh.ai and ankit@hushh.ai
 */
export const sendNDANotification = async (
  signerName: string,
  signerEmail: string,
  signedAt: string,
  ndaVersion: string,
  pdfUrl?: string,
  pdfBlob?: Blob,
  userId?: string,
  signerIp?: string,
  documentsAcknowledged?: string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Prepare payload
    const payload: Record<string, unknown> = {
      signerName,
      signerEmail,
      signedAt,
      ndaVersion,
      signerIp: signerIp || 'Unknown',
      userId,
    };

    // Include acknowledged fund documents list
    if (documentsAcknowledged && documentsAcknowledged.length > 0) {
      payload.documentsAcknowledged = documentsAcknowledged;
    }

    // Include PDF URL if available
    if (pdfUrl) {
      payload.pdfUrl = pdfUrl;
    }

    // Convert PDF blob to base64 if provided for attachment
    if (pdfBlob) {
      try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        payload.pdfBase64 = base64;
      } catch (blobErr) {
        console.warn('Could not convert PDF blob to base64:', blobErr);
      }
    }

    // Call the Supabase Edge Function
    const response = await fetch(NDA_NOTIFICATION_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NDA notification failed:', errorText);
      return {
        success: false,
        error: `Failed to send notification: ${errorText}`,
      };
    }

    const result = await response.json();
    console.log('NDA notification sent successfully:', result);

    return { success: true };
  } catch (err) {
    console.error('Error sending NDA notification:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Upload signed NDA PDF to Supabase Storage
 */
export const uploadSignedNDA = async (
  userId: string,
  pdfBlob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    if (!config.supabaseClient) {
      console.error('Supabase client not initialized');
      return {
        success: false,
        error: 'Supabase client not initialized',
      };
    }
    
    const fileName = `nda_${userId}_${Date.now()}.pdf`;
    const filePath = `signed-ndas/${fileName}`;
    
    const { data, error } = await config.supabaseClient.storage
      .from('assets')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading NDA PDF:', error);
      return {
        success: false,
        error: error.message,
      };
    }
    
    // Get public URL
    const { data: urlData } = config.supabaseClient.storage
      .from('assets')
      .getPublicUrl(filePath);
    
    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (err) {
    console.error('Error in uploadSignedNDA:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

export default {
  checkNDAStatus,
  signNDA,
  generateNDAPdf,
  sendNDANotification,
  uploadSignedNDA,
};
