/**
 * Script to split hushh-user-profile/index.tsx into logic.ts + ui.tsx
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'pages', 'hushh-user-profile');
const src = fs.readFileSync(path.join(dir, 'index.tsx'), 'utf8');
const lines = src.split('\n');

// ─── LOGIC.TS ───
const logicLines = [];

// Header
logicLines.push('/**');
logicLines.push(' * HushhUserProfile — All Business Logic');
logicLines.push(' * State, effects, handlers, constants extracted into useHushhUserProfileLogic hook');
logicLines.push(' */');
logicLines.push("import { useEffect, useState } from 'react';");
logicLines.push("import { useNavigate } from 'react-router-dom';");
logicLines.push("import { useToast, useClipboard } from '@chakra-ui/react';");
logicLines.push("import { useFooterVisibility } from '../../utils/useFooterVisibility';");
logicLines.push("import resources from '../../resources/resources';");
logicLines.push("import { generateInvestorProfile } from '../../services/investorProfile/apiClient';");
logicLines.push("import { downloadHushhGoldPass, launchGoogleWalletPass } from '../../services/walletPass';");
logicLines.push("import { InvestorProfile, FIELD_LABELS, VALUE_LABELS } from '../../types/investorProfile';");
logicLines.push("import { calculateNWSFromDB, NWSResult } from '../../services/networkScore/calculateNWS';");
logicLines.push("import { invokeShadowInvestigator, formatPhoneContact, ShadowProfile, SHADOW_FIELD_LABELS } from '../../services/shadowInvestigator';");
logicLines.push('');
logicLines.push('// Re-export types for UI');
logicLines.push('export type { InvestorProfile, NWSResult, ShadowProfile };');
logicLines.push('export { FIELD_LABELS, VALUE_LABELS, SHADOW_FIELD_LABELS, formatPhoneContact };');
logicLines.push('');

// Constants and types (lines 19-94: COUNTRIES, FormState, defaultFormState)
for (let i = 18; i < 94; i++) {
  logicLines.push(lines[i]);
}
logicLines.push('');
logicLines.push('export type { FormState };');
logicLines.push('export { defaultFormState };');
logicLines.push('');

// Hook definition
logicLines.push('export const useHushhUserProfileLogic = () => {');
logicLines.push('  const navigate = useNavigate();');
logicLines.push('  const toast = useToast();');
logicLines.push('  const isFooterVisible = useFooterVisibility();');

// State and handlers (lines 100-770)
for (let i = 99; i < 770; i++) {
  logicLines.push(lines[i]);
}

// Return object
logicLines.push('');
logicLines.push('  return {');
logicLines.push('    form, setForm, userId, investorProfile, setInvestorProfile, profileSlug,');
logicLines.push('    loading, setLoading, hasOnboardingData, isApplePassLoading, isGooglePassLoading,');
logicLines.push('    editingField, setEditingField, shadowProfile, shadowLoading, nwsResult, nwsLoading,');
logicLines.push('    isFooterVisible, hasCopied, onCopy, profileUrl, navigate, toast,');
logicLines.push('    FIELD_OPTIONS, MULTI_SELECT_FIELDS, COUNTRIES, defaultFormState,');
logicLines.push('    handleUpdateAIField, handleMultiSelectToggle, handleChange, handleSubmit,');
logicLines.push('    handleBack, handleSave, handleAppleWalletPass, handleGoogleWalletPass,');
logicLines.push('    handleShareWhatsApp, handleShareX, handleShareEmail, handleShareLinkedIn, handleOpenProfile,');
logicLines.push('  };');
logicLines.push('};');

fs.writeFileSync(path.join(dir, 'logic.ts'), logicLines.join('\n'));
console.log('logic.ts written:', logicLines.length, 'lines');

// ─── UI.TSX ───
const uiLines = [];

uiLines.push('/**');
uiLines.push(' * HushhUserProfile — All UI / Presentation');
uiLines.push(' * Pure presentation component importing hook from logic');
uiLines.push(' */');
uiLines.push("import React from 'react';");
uiLines.push("import { useHushhUserProfileLogic, FIELD_LABELS, VALUE_LABELS, SHADOW_FIELD_LABELS, formatPhoneContact } from './logic';");
uiLines.push("import type { FormState } from './logic';");
uiLines.push("import { ArrowLeft, User, TrendingUp, Shield, ChevronDown, Calendar, Brain, Target, Clock, Gauge, Droplets, Briefcase, Layers, Zap, Activity, ChevronUp, Edit2, Share2, Link, Copy, Check, ExternalLink, Home, Search, Globe, Coffee, Heart, Users, Newspaper } from 'lucide-react';");
uiLines.push("import { FaApple, FaWhatsapp, FaLinkedin } from 'react-icons/fa';");
uiLines.push("import { FaXTwitter } from 'react-icons/fa6';");
uiLines.push("import { SiGooglepay } from 'react-icons/si';");
uiLines.push("import { HiMail } from 'react-icons/hi';");
uiLines.push("import AIDetectedPreferences from '../../components/profile/AIDetectedPreferences';");
uiLines.push("import NWSScoreBadge from '../../components/profile/NWSScoreBadge';");
uiLines.push('');
uiLines.push('const HushhUserProfilePage: React.FC = () => {');
uiLines.push('  const s = useHushhUserProfileLogic();');
uiLines.push('');

// JSX portion (lines 773-end, minus final closing brace and export)
// Find where "return (" starts (line 773) and component ends
for (let i = 772; i < lines.length; i++) {
  let line = lines[i];
  // Skip the final export default and closing brace
  if (line.trim() === 'export default HushhUserProfilePage;') continue;
  if (i === lines.length - 1 && line.trim() === '') continue;
  
  // Replace bare variable references with s. prefix
  const vars = [
    'handleUpdateAIField', 'handleMultiSelectToggle', 'handleChange', 'handleSubmit',
    'handleBack', 'handleSave', 'handleAppleWalletPass', 'handleGoogleWalletPass',
    'handleShareWhatsApp', 'handleShareX', 'handleShareEmail', 'handleShareLinkedIn', 'handleOpenProfile',
    'isFooterVisible', 'hasCopied', 'onCopy', 'profileUrl',
    'isApplePassLoading', 'isGooglePassLoading', 'shadowLoading', 'nwsLoading',
    'editingField', 'setEditingField', 'shadowProfile', 'nwsResult',
    'investorProfile', 'setInvestorProfile', 'profileSlug',
    'hasOnboardingData', 'defaultFormState',
    'FIELD_OPTIONS', 'MULTI_SELECT_FIELDS', 'COUNTRIES',
  ];
  
  vars.forEach(v => {
    // Replace {varName} patterns and varName( patterns, but not .varName or import
    const re = new RegExp('\\{' + v + '\\}', 'g');
    line = line.replace(re, '{s.' + v + '}');
    
    const re2 = new RegExp('\\{' + v + '\\s', 'g');
    line = line.replace(re2, '{s.' + v + ' ');

    const re3 = new RegExp('\\{' + v + '\\.', 'g');
    line = line.replace(re3, '{s.' + v + '.');

    // onClick={handleX} patterns
    const re4 = new RegExp('=' + '\\{' + v, 'g');
    line = line.replace(re4, '={s.' + v);
    
    // Ternary: varName ? or varName &&
    const re5 = new RegExp('\\{' + v + ' (\\?|&&|\\|\\|)', 'g');
    line = line.replace(re5, '{s.' + v + ' $1');
  });
  
  // Handle form.X references  
  line = line.replace(/\{form\./g, '{s.form.');
  line = line.replace(/\{form\}/g, '{s.form}');
  line = line.replace(/\{loading\}/g, '{s.loading}');
  line = line.replace(/\{loading /g, '{s.loading ');
  line = line.replace(/\{userId\}/g, '{s.userId}');
  line = line.replace(/=\{loading\}/g, '={s.loading}');
  line = line.replace(/=\{navigate\}/g, '={s.navigate}');
  line = line.replace(/navigate\(/g, 's.navigate(');
  line = line.replace(/toast\(/g, 's.toast(');
  line = line.replace(/setForm\(/g, 's.setForm(');
  line = line.replace(/setLoading\(/g, 's.setLoading(');
  
  uiLines.push(line);
}

uiLines.push('');
uiLines.push('export default HushhUserProfilePage;');

fs.writeFileSync(path.join(dir, 'ui.tsx'), uiLines.join('\n'));
console.log('ui.tsx written:', uiLines.length, 'lines');

// Update index.tsx to re-export
fs.writeFileSync(path.join(dir, 'index.tsx'), "export { default } from './ui';\n");
console.log('index.tsx updated to re-export from ui.tsx');
