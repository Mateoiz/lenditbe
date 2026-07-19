'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitVerification } from './actions'

// ── ID type definitions (unchanged) ──
interface IdMeta { value: string; label: string; hint: string; mask: string; pattern: RegExp; requiresBack: boolean }
function maskToPattern(mask: string): RegExp {
  const escaped = mask.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/#/g, '\\d').replace(/A/g, '[A-Za-z]')}$`)
}
const RAW_ID_TYPES = [
  { value: 'philsys',         label: 'PhilSys (National ID)',  hint: '1234-5678-9012-3456',   mask: '####-####-####-####',   requiresBack: true  },
  { value: 'passport',        label: 'Philippine Passport',    hint: 'P1234567A',              mask: 'A########',             requiresBack: false },
  { value: 'drivers_license', label: "Driver's License",       hint: 'A01-23-456789',          mask: 'A##-##-######',         requiresBack: true  },
  { value: 'umid',            label: 'UMID',                   hint: '0000-0000000-0',         mask: '####-#######-#',        requiresBack: true  },
  { value: 'sss',             label: 'SSS ID',                 hint: '00-0000000-0',           mask: '##-#######-#',          requiresBack: true  },
  { value: 'tin',             label: 'TIN ID',                 hint: '000-000-000-000',        mask: '###-###-###-###',       requiresBack: false },
  { value: 'postal_id',       label: 'Postal ID',              hint: 'PRN-000000000000',       mask: 'AAA-############',      requiresBack: true  },
  { value: 'voters_id',       label: "Voter's ID",             hint: '0000-0000A-00000AAA',    mask: '####-#####-########',   requiresBack: true  },
]
const ID_TYPES: IdMeta[] = RAW_ID_TYPES.map(t => ({ ...t, pattern: maskToPattern(t.mask) }))

type CameraTarget = 'idFront' | 'idBack' | 'face' | null

const PH_MOBILE = /^(09|\+639)\d{9}$/
const STEPS = [
  { num: 1, label: '01 / INFO'  },
  { num: 2, label: '02 / WORK'  },
  { num: 3, label: '03 / DOC'   },
  { num: 4, label: '04 / SCANS' },
  { num: 5, label: '05 / LEGAL' },
]

export default function VerifyForm({ currentStatus }: { currentStatus: string }) {
  const router = useRouter()
  const [step, setStep]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [errors, setErrors]           = useState<Record<string, string>>({})

  // ── Step 1: Personal Info ──
  const [firstName,   setFirstName]   = useState('')
  const [middleName,  setMiddleName]  = useState('')
  const [lastName,    setLastName]    = useState('')
  const [suffix,      setSuffix]      = useState('')
  const [birthDate,   setBirthDate]   = useState('')
  const [gender,      setGender]      = useState('')
  const [civilStatus, setCivilStatus] = useState('')
  const [mobile,      setMobile]      = useState('')
  // Address
  const [addressLine, setAddressLine] = useState('')
  const [barangay,    setBarangay]    = useState('')
  const [city,        setCity]        = useState('')
  const [province,    setProvince]    = useState('')
  const [postalCode,  setPostalCode]  = useState('')

  // ── Step 2: Employment & Disbursement ──
  const [employmentType,   setEmploymentType]   = useState('')
  const [employerName,     setEmployerName]     = useState('')
  const [monthlyIncome,    setMonthlyIncome]    = useState('')
  const [schoolName,       setSchoolName]       = useState('')
  const [guardianName,     setGuardianName]     = useState('')
  const [guardianMobile,   setGuardianMobile]   = useState('')
  const [guardianIncome,   setGuardianIncome]   = useState('')
  const [disbursementMethod, setDisbursementMethod]   = useState('')
  const [accountName,        setAccountName]          = useState('')
  const [accountNumber,      setAccountNumber]        = useState('')

  // ── Step 3: Document ──
  const [idType,   setIdType]   = useState('')
  const [idNumber, setIdNumber] = useState('')
  const selectedMeta = ID_TYPES.find(t => t.value === idType)

  // ── Step 4: Camera ──
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null)
  const [idBackFile,  setIdBackFile]  = useState<File | null>(null)
  const [faceFile,    setFaceFile]    = useState<File | null>(null)
  const [idFrontPreview, setIdFrontPreview] = useState('')
  const [idBackPreview,  setIdBackPreview]  = useState('')
  const [facePreview,    setFacePreview]    = useState('')
  const [activeTarget,   setActiveTarget]   = useState<CameraTarget>(null)
  const [cameraError,    setCameraError]    = useState('')
  const [cameraUnsupported, setCameraUnsupported] = useState(false)
  const videoRef  = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRequestId = useRef(0)

  // ── Step 5: Legal ──
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [creditConsent,  setCreditConsent]  = useState(false)

  const isStudent = employmentType === 'student'

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (idFrontFile || idBackFile || faceFile) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [idFrontFile, idBackFile, faceFile])

  useEffect(() => {
    return () => {
      if (idFrontPreview) URL.revokeObjectURL(idFrontPreview)
      if (idBackPreview)  URL.revokeObjectURL(idBackPreview)
      if (facePreview)    URL.revokeObjectURL(facePreview)
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (activeTarget) { document.body.style.overflow = 'hidden' }
    else              { document.body.style.overflow = 'unset'; stopCamera() }
    return () => { document.body.style.overflow = 'unset' }
  }, [activeTarget])

  // ── Validators ──
  function validateStep1() {
    const e: Record<string, string> = {}
    if (!firstName.trim())   e.firstName   = 'First name is required.'
    if (!lastName.trim())    e.lastName    = 'Last name is required.'
    if (!birthDate)          e.birthDate   = 'Date of birth is required.'
    else {
      const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)
      if (age < 18) e.birthDate = 'You must be at least 18 years old.'
    }
    if (!gender)             e.gender      = 'Please select a gender.'
    if (!civilStatus)        e.civilStatus = 'Please select civil status.'
    if (!mobile.trim())      e.mobile      = 'Mobile number is required.'
    else if (!PH_MOBILE.test(mobile.replace(/\s/g, '')))
      e.mobile = 'Enter a valid PH number (09XXXXXXXXX or +639XXXXXXXXX).'
    if (!addressLine.trim()) e.addressLine = 'House/unit/street is required.'
    if (!barangay.trim())    e.barangay    = 'Barangay is required.'
    if (!city.trim())        e.city        = 'City/municipality is required.'
    if (!province.trim())    e.province    = 'Province is required.'
    if (!postalCode.trim())  e.postalCode  = 'Postal code is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    if (!employmentType) e.employmentType = 'Please select employment type.'
    if (isStudent) {
      if (!schoolName.trim())  e.schoolName    = 'School name is required.'
      if (!guardianName.trim()) e.guardianName  = 'Guardian name is required.'
      if (!guardianMobile.trim()) e.guardianMobile = 'Guardian mobile is required.'
      else if (!PH_MOBILE.test(guardianMobile.replace(/\s/g, '')))
        e.guardianMobile = 'Enter a valid PH mobile number.'
    } else {
      if (!monthlyIncome || isNaN(parseFloat(monthlyIncome)))
        e.monthlyIncome = 'Please enter your monthly income.'
    }
    if (!disbursementMethod)   e.disbursementMethod = 'Select a disbursement method.'
    if (!accountName.trim())   e.accountName        = 'Account name is required.'
    if (!accountNumber.trim()) e.accountNumber      = 'Account number is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep3() {
    const e: Record<string, string> = {}
    if (!idType) e.idType = 'Please select a government ID type.'
    if (!idNumber.trim()) e.idNumber = 'ID number is required.'
    else if (selectedMeta && !selectedMeta.pattern.test(idNumber.trim()))
      e.idNumber = `Doesn't match the expected format (${selectedMeta.hint}).`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep4() {
    const e: Record<string, string> = {}
    if (!idFrontFile) e.idFront = 'ID Front live scan is required.'
    if (selectedMeta?.requiresBack && !idBackFile) e.idBack = 'ID Back live scan is required.'
    if (!faceFile) e.face = 'Live face verification scan is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Camera helpers (unchanged) ──
  async function startCamera(target: CameraTarget) {
    stopCamera(); setCameraError(''); setCameraUnsupported(false); setActiveTarget(target)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraUnsupported(true)
      setCameraError('Camera not supported on this browser or connection.')
      return
    }
    const requestId = ++cameraRequestId.current
    try {
      const facingMode = target === 'face' ? 'user' : { ideal: 'environment' }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      if (requestId !== cameraRequestId.current) { stream.getTracks().forEach(t => t.stop()); return }
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch { if (requestId === cameraRequestId.current) setCameraError('Unable to access camera. Please grant permissions.') }
  }

  function stopCamera() {
    cameraRequestId.current++
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current || !activeTarget) return
    const video = videoRef.current; const canvas = canvasRef.current
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      if (activeTarget === 'face') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1) }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return
        const file = new File([blob], `live_${activeTarget}_${Date.now()}.jpg`, { type: 'image/jpeg' })
        const url  = URL.createObjectURL(blob)
        if (activeTarget === 'idFront') { if (idFrontPreview) URL.revokeObjectURL(idFrontPreview); setIdFrontFile(file); setIdFrontPreview(url) }
        if (activeTarget === 'idBack')  { if (idBackPreview)  URL.revokeObjectURL(idBackPreview);  setIdBackFile(file);  setIdBackPreview(url)  }
        if (activeTarget === 'face')    { if (facePreview)    URL.revokeObjectURL(facePreview);    setFaceFile(file);    setFacePreview(url)    }
        setActiveTarget(null)
      }, 'image/jpeg', 0.92)
    }
  }

  async function handleSubmit() {
    setGlobalError('')
    if (!privacyConsent || !creditConsent) { setGlobalError('You must check both legal disclosures.'); return }
    setLoading(true)
    const fd = new FormData()
    fd.set('first_name', firstName); fd.set('middle_name', middleName); fd.set('last_name', lastName)
    fd.set('suffix', suffix); fd.set('birth_date', birthDate); fd.set('gender', gender)
    fd.set('civil_status', civilStatus); fd.set('mobile_number', mobile)
    fd.set('address_line', addressLine); fd.set('barangay', barangay); fd.set('city', city)
    fd.set('province', province); fd.set('postal_code', postalCode)
    fd.set('employment_type', employmentType); fd.set('employer_name', employerName)
    fd.set('monthly_income', monthlyIncome); fd.set('school_name', schoolName)
    fd.set('guardian_name', guardianName); fd.set('guardian_mobile', guardianMobile)
    fd.set('guardian_monthly_income', guardianIncome)
    fd.set('disbursement_method', disbursementMethod)
    fd.set('disbursement_account_name', accountName); fd.set('disbursement_account_number', accountNumber)
    fd.set('id_type', idType); fd.set('id_number', idNumber.trim())
    if (idFrontFile) fd.set('id_front', idFrontFile)
    if (idBackFile)  fd.set('id_back', idBackFile)
    if (faceFile)    fd.set('selfie', faceFile)
    try {
      const result = await submitVerification(fd)
      if (!result.ok) { setGlobalError(result.error); setLoading(false); return }
      router.push('/dashboard?kyc=submitted')
    } catch (err: any) { setGlobalError(err.message ?? 'Network error. Please try again.'); setLoading(false) }
  }

  // ── Shared field error message ──
  const ErrMsg = ({ k }: { k: string }) =>
    errors[k] ? <span className="text-xs mt-1.5 block font-medium" style={{ color: 'var(--magenta)' }}>{errors[k]}</span> : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        :root {
          --paper:#FFFDF7; --paper-2:#F5F0E4; --card:#FFFFFF;
          --ink:#14110F; --ink-2:#3A362F; --ink-3:#6B655A; --ink-4:#9C9484;
          --teal:#0B5D52; --teal-dark:#073F38; --teal-bg:#E5F1EE; --teal-bdr:#B9D9D2;
          --marigold:#F5A623; --marigold-dark:#B87814; --marigold-bg:#FDF0DA; --marigold-bdr:#F0CE93;
          --magenta:#C81E5C; --magenta-bg:#FBE7EF; --magenta-bdr:#EFB4CB;
          --line:rgba(20,17,15,0.10); --line-md:rgba(20,17,15,0.18);
        }
        body { font-family:'Inter',-apple-system,sans-serif; background:var(--paper); color:var(--ink); -webkit-tap-highlight-color:transparent; }
        .font-display { font-family:'Fraunces',Georgia,serif; }
        .font-mono    { font-family:'Space Mono',monospace; }
        .blueprint-canvas { min-height:100vh; background-color:var(--paper); background-image:radial-gradient(rgba(20,17,15,0.06) 1px,transparent 0); background-size:22px 22px; display:flex; flex-direction:column; }
        .verification-card { background:var(--card); border:1.5px solid var(--line-md); border-radius:6px; padding:20px; }
        @media(min-width:640px){ .verification-card { padding:44px; } }
        .field-label { display:block; font-size:11px; font-weight:700; font-family:'Space Mono',monospace; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-4); margin-bottom:8px; }
        .field-input { width:100%; padding:12px 14px; border-radius:4px; border:1.5px solid var(--line-md); background:var(--paper-2); color:var(--ink); font-size:15px; font-weight:500; transition:all .2s ease; outline:none; box-sizing:border-box; font-family:'Inter',sans-serif; }
        .field-input:focus { border-color:var(--teal); background:var(--card); box-shadow:0 0 0 3px var(--teal-bg); }
        .field-input.error { border-color:var(--magenta); background:var(--magenta-bg); }
        .scan-box { border:1.5px solid var(--line-md); border-radius:6px; background:var(--paper-2); overflow:hidden; }
        .scan-box.error { border-color:var(--magenta); background:var(--magenta-bg); }
        .reticle-card { width:85%; max-width:380px; aspect-ratio:1.58/1; border:2px dashed rgba(255,253,247,0.75); border-radius:8px; pointer-events:none; box-shadow:0 0 0 9999px rgba(0,0,0,.65); }
        .reticle-face { width:70%; max-width:280px; aspect-ratio:3/4; border:2px dashed rgba(245,166,35,.85); border-radius:50%; pointer-events:none; box-shadow:0 0 0 9999px rgba(0,0,0,.65); }
        .btn-primary { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:12px 24px; border-radius:4px; min-height:48px; background:var(--marigold); color:var(--teal-dark); font-size:14px; font-weight:700; border:1.5px solid var(--ink); cursor:pointer; box-shadow:3px 3px 0 var(--ink); transition:all .15s ease; touch-action:manipulation; font-family:'Inter',sans-serif; }
        .btn-primary:hover:not(:disabled) { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--ink); }
        .btn-primary:active:not(:disabled) { transform:translate(1px,1px); box-shadow:1px 1px 0 var(--ink); }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; box-shadow:none; transform:none; }
        .btn-primary.dark { background:var(--ink); color:var(--paper); }
        .btn-ghost { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:12px 22px; border-radius:4px; min-height:48px; background:var(--card); color:var(--ink-2); font-size:14px; font-weight:600; border:1.5px solid var(--line-md); cursor:pointer; transition:all .15s ease; touch-action:manipulation; font-family:'Inter',sans-serif; }
        .btn-ghost:hover { border-color:var(--teal); color:var(--teal); background:var(--teal-bg); }
        .step-tab { display:flex; align-items:center; gap:10px; padding-bottom:10px; border-bottom:2px solid transparent; transition:all .2s ease; font-size:9px; }
        @media(min-width:640px){ .step-tab { font-size:11px; } }
        .step-tab.active { border-color:var(--marigold); color:var(--marigold-dark); }
        .step-tab.done   { border-color:var(--teal); color:var(--teal-dark); }
        .step-tab.idle   { border-color:var(--line-md); color:var(--ink-4); }
        .section-heading { font-family:'Space Mono',monospace; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--ink-4); padding-bottom:10px; border-bottom:1px dashed var(--line-md); margin-bottom:16px; }
        .sticky-header { padding-top:env(safe-area-inset-top); }
        .camera-topbar { padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 16px max(16px,env(safe-area-inset-left)); }
        .camera-bottombar { padding:24px max(24px,env(safe-area-inset-right)) max(40px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left)); }
      `}</style>

      {/* ── FULLSCREEN CAMERA MODAL (unchanged) ── */}
      {activeTarget && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between" style={{ background: '#0F0D0B' }}>
          <div className="camera-topbar flex items-center justify-between backdrop-blur z-10" style={{ background: 'rgba(15,13,11,0.92)', color: '#FFFDF7', borderBottom: '1px solid rgba(255,253,247,0.12)' }}>
            <span className="text-xs font-mono font-bold tracking-wider flex items-center gap-2" style={{ color: 'var(--marigold)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--magenta)' }} />
              {activeTarget === 'idFront' ? 'SCAN FRONT OF ID' : activeTarget === 'idBack' ? 'SCAN BACK OF ID' : 'BIOMETRIC SELFIE'}
            </span>
            <button type="button" onClick={() => setActiveTarget(null)} className="px-3.5 py-2 rounded-lg text-xs font-mono font-semibold" style={{ background: 'rgba(255,253,247,0.1)', color: '#FFFDF7' }}>✕ CANCEL</button>
          </div>
          <div className="relative flex-1 flex items-center justify-center overflow-hidden" style={{ background: '#000' }}>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={activeTarget === 'face' ? { transform: 'scaleX(-1)' } : undefined} />
            <canvas ref={canvasRef} className="hidden" />
            {activeTarget === 'face' ? <div className="reticle-face" /> : <div className="reticle-card" />}
            {cameraError && <div className="absolute inset-x-6 top-6 z-20 p-3 rounded-xl text-xs font-medium text-center" style={{ background: 'var(--magenta)', color: '#FFFDF7' }}>{cameraError}</div>}
          </div>
          <div className="camera-bottombar flex flex-col items-center gap-4 z-10" style={{ background: 'rgba(15,13,11,0.95)', borderTop: '1px solid rgba(255,253,247,0.12)' }}>
            <p className="text-xs font-mono text-center" style={{ color: 'rgba(255,253,247,0.7)' }}>
              {activeTarget === 'face' ? 'Align face within oval in good lighting' : 'Fit ID card edges within the dotted box'}
            </p>
            <button type="button" onClick={captureFrame} disabled={cameraUnsupported} aria-label="Take Photo"
              className="rounded-full flex items-center justify-center p-1.5 active:scale-90 transition-all"
              style={{ width: 72, height: 72, background: '#FFFDF7', border: '4px solid var(--marigold)', opacity: cameraUnsupported ? 0.4 : 1 }}>
              <div className="w-full h-full rounded-full" style={{ background: 'var(--teal)' }} />
            </button>
          </div>
        </div>
      )}

      <div className="blueprint-canvas">
        <header className="sticky-header w-full backdrop-blur-md px-4 sm:px-10 py-3.5 flex items-center justify-between sticky top-0 z-50" style={{ borderBottom: '2px solid var(--ink)', background: 'rgba(255,253,247,0.85)' }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/dashboard" className="font-display text-lg sm:text-xl" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
              Lendit<span style={{ color: 'var(--teal)', fontStyle: 'italic' }}>Be</span>
            </a>
            <span className="font-light" style={{ color: 'var(--ink-4)' }}>/</span>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: 'var(--ink-3)', background: 'var(--paper-2)' }}>Live KYC</span>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-[11px] font-mono py-1 px-2" style={{ color: 'var(--ink-4)' }}>EXIT</button>
        </header>

        <main className="flex-1 flex items-start justify-center p-3 sm:p-8 md:p-12">
          <div className="w-full max-w-xl">
            <div className="mb-6 sm:mb-8">
              <h1 className="font-display text-2xl sm:text-4xl" style={{ color: 'var(--ink)', fontWeight: 500 }}>Identity Verification</h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--ink-3)' }}>Complete all steps to unlock your borrowing capacity.</p>
            </div>

            {currentStatus === 'rejected' && (
              <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', color: 'var(--magenta)' }}>
                <span>⚠️</span>
                <div className="text-xs sm:text-sm"><strong className="block">Previous Verification Rejected</strong>Please ensure scans are glare-free and your face is well-lit.</div>
              </div>
            )}

            {globalError && (
              <div className="rounded-xl p-4 mb-6 flex items-center gap-3 text-xs font-medium" style={{ background: 'var(--magenta-bg)', border: '1.5px solid var(--magenta-bdr)', color: 'var(--magenta)' }}>
                <span>🚨</span><span>{globalError}</span>
              </div>
            )}

            <div className="verification-card">
              {/* Step tabs */}
              <div className="grid gap-1 mb-6 pb-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1.5px solid var(--line)' }}>
                {STEPS.map(s => {
                  const state = step > s.num ? 'done' : step === s.num ? 'active' : 'idle'
                  return (
                    <div key={s.num} className={`step-tab font-mono font-bold tracking-wider justify-center ${state}`}>
                      {s.label}
                    </div>
                  )
                })}
              </div>

              {/* ── STEP 1: PERSONAL INFO + ADDRESS ── */}
              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <p className="section-heading">Personal Information</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">First Name *</label>
                      <input className={`field-input ${errors.firstName ? 'error' : ''}`} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" />
                      <ErrMsg k="firstName" />
                    </div>
                    <div>
                      <label className="field-label">Last Name *</label>
                      <input className={`field-input ${errors.lastName ? 'error' : ''}`} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="dela Cruz" />
                      <ErrMsg k="lastName" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Middle Name</label>
                      <input className="field-input" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Santos (optional)" />
                    </div>
                    <div>
                      <label className="field-label">Suffix</label>
                      <select className="field-input" value={suffix} onChange={e => setSuffix(e.target.value)}>
                        <option value="">None</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                        <option value="IV">IV</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Date of Birth *</label>
                      <input type="date" className={`field-input ${errors.birthDate ? 'error' : ''}`} value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                      <ErrMsg k="birthDate" />
                    </div>
                    <div>
                      <label className="field-label">Gender *</label>
                      <select className={`field-input ${errors.gender ? 'error' : ''}`} value={gender} onChange={e => setGender(e.target.value)}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                      <ErrMsg k="gender" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Civil Status *</label>
                      <select className={`field-input ${errors.civilStatus ? 'error' : ''}`} value={civilStatus} onChange={e => setCivilStatus(e.target.value)}>
                        <option value="">Select...</option>
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                        <option value="widowed">Widowed</option>
                        <option value="separated">Separated</option>
                      </select>
                      <ErrMsg k="civilStatus" />
                    </div>
                    <div>
                      <label className="field-label">Mobile Number *</label>
                      <input className={`field-input font-mono ${errors.mobile ? 'error' : ''}`} value={mobile} onChange={e => setMobile(e.target.value)} placeholder="09XX-XXX-XXXX" />
                      <ErrMsg k="mobile" />
                    </div>
                  </div>

                  <p className="section-heading" style={{ marginTop: 8 }}>Home Address</p>

                  <div>
                    <label className="field-label">House No. / Unit / Street *</label>
                    <input className={`field-input ${errors.addressLine ? 'error' : ''}`} value={addressLine} onChange={e => setAddressLine(e.target.value)} placeholder="123 Rizal St." />
                    <ErrMsg k="addressLine" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Barangay *</label>
                      <input className={`field-input ${errors.barangay ? 'error' : ''}`} value={barangay} onChange={e => setBarangay(e.target.value)} placeholder="Brgy. San Antonio" />
                      <ErrMsg k="barangay" />
                    </div>
                    <div>
                      <label className="field-label">City / Municipality *</label>
                      <input className={`field-input ${errors.city ? 'error' : ''}`} value={city} onChange={e => setCity(e.target.value)} placeholder="Quezon City" />
                      <ErrMsg k="city" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Province *</label>
                      <input className={`field-input ${errors.province ? 'error' : ''}`} value={province} onChange={e => setProvince(e.target.value)} placeholder="Metro Manila" />
                      <ErrMsg k="province" />
                    </div>
                    <div>
                      <label className="field-label">Postal Code *</label>
                      <input className={`field-input font-mono ${errors.postalCode ? 'error' : ''}`} value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="1100" maxLength={4} />
                      <ErrMsg k="postalCode" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3" style={{ borderTop: '1.5px solid var(--line)' }}>
                    <button className="btn-primary w-full sm:w-auto" onClick={() => { if (validateStep1()) setStep(2) }}>
                      Employment & Disbursement →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: EMPLOYMENT + DISBURSEMENT ── */}
              {step === 2 && (
                <div className="flex flex-col gap-5">
                  <p className="section-heading">Employment</p>

                  <div>
                    <label className="field-label">Employment Type *</label>
                    <select className={`field-input ${errors.employmentType ? 'error' : ''}`} value={employmentType} onChange={e => setEmploymentType(e.target.value)}>
                      <option value="">Select...</option>
                      <option value="employed">Employed</option>
                      <option value="self_employed">Self-employed</option>
                      <option value="freelance">Freelance</option>
                      <option value="business_owner">Business Owner</option>
                      <option value="student">Student</option>
                      <option value="unemployed">Unemployed</option>
                    </select>
                    <ErrMsg k="employmentType" />
                  </div>

                  {isStudent ? (
                    <>
                      <div>
                        <label className="field-label">School Name *</label>
                        <input className={`field-input ${errors.schoolName ? 'error' : ''}`} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="University of the Philippines" />
                        <ErrMsg k="schoolName" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="field-label">Guardian Name *</label>
                          <input className={`field-input ${errors.guardianName ? 'error' : ''}`} value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Full name" />
                          <ErrMsg k="guardianName" />
                        </div>
                        <div>
                          <label className="field-label">Guardian Mobile *</label>
                          <input className={`field-input font-mono ${errors.guardianMobile ? 'error' : ''}`} value={guardianMobile} onChange={e => setGuardianMobile(e.target.value)} placeholder="09XX-XXX-XXXX" />
                          <ErrMsg k="guardianMobile" />
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Guardian Monthly Income</label>
                        <input type="number" className="field-input" value={guardianIncome} onChange={e => setGuardianIncome(e.target.value)} placeholder="₱ 0.00" min="0" />
                      </div>
                    </>
                  ) : employmentType && employmentType !== 'unemployed' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="field-label">{employmentType === 'business_owner' ? 'Business Name' : 'Employer Name'}</label>
                        <input className="field-input" value={employerName} onChange={e => setEmployerName(e.target.value)} placeholder="Company / Business" />
                      </div>
                      <div>
                        <label className="field-label">Monthly Income *</label>
                        <input type="number" className={`field-input ${errors.monthlyIncome ? 'error' : ''}`} value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} placeholder="₱ 0.00" min="0" />
                        <ErrMsg k="monthlyIncome" />
                      </div>
                    </div>
                  ) : employmentType === 'unemployed' ? (
                    <div>
                      <label className="field-label">Monthly Income *</label>
                      <input type="number" className={`field-input ${errors.monthlyIncome ? 'error' : ''}`} value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} placeholder="₱ 0.00" min="0" />
                      <ErrMsg k="monthlyIncome" />
                    </div>
                  ) : null}

                  <p className="section-heading" style={{ marginTop: 8 }}>Disbursement Account</p>
                  <p className="text-xs" style={{ color: 'var(--ink-3)', marginTop: -12 }}>Where your loan proceeds will be sent.</p>

                  <div>
                    <label className="field-label">Disbursement Method *</label>
                    <select className={`field-input ${errors.disbursementMethod ? 'error' : ''}`} value={disbursementMethod} onChange={e => setDisbursementMethod(e.target.value)}>
                      <option value="">Select...</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash_pickup">Cash Pickup</option>
                    </select>
                    <ErrMsg k="disbursementMethod" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Account Name *</label>
                      <input className={`field-input ${errors.accountName ? 'error' : ''}`} value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="As registered" />
                      <ErrMsg k="accountName" />
                    </div>
                    <div>
                      <label className="field-label">Account Number *</label>
                      <input className={`field-input font-mono ${errors.accountNumber ? 'error' : ''}`} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="09XX-XXX-XXXX or acct no." />
                      <ErrMsg k="accountNumber" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 gap-3" style={{ borderTop: '1.5px solid var(--line)' }}>
                    <button className="btn-ghost flex-1 sm:flex-none" onClick={() => { setErrors({}); setStep(1) }}>← Back</button>
                    <button className="btn-primary grow sm:flex-none" onClick={() => { if (validateStep2()) setStep(3) }}>Government ID →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: DOCUMENT (was step 1) ── */}
              {step === 3 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <p className="section-heading">Government Document</p>

                  <div>
                    <label className="field-label">ID Type *</label>
                    <select className={`field-input ${errors.idType ? 'error' : ''}`} value={idType} onChange={e => { setIdType(e.target.value); setErrors(prev => ({ ...prev, idType: '', idNumber: '' })) }}>
                      <option value="">Select identification type...</option>
                      {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ErrMsg k="idType" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="field-label !mb-0">Document Number *</label>
                      {selectedMeta && <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--teal)' }}>Format: {selectedMeta.hint}</span>}
                    </div>
                    <input type="text" className={`field-input font-mono uppercase ${errors.idNumber ? 'error' : ''}`} placeholder={selectedMeta?.hint ?? 'Enter exact document number'} value={idNumber} onChange={e => { setIdNumber(e.target.value); setErrors(prev => ({ ...prev, idNumber: '' })) }} />
                    <ErrMsg k="idNumber" />
                  </div>

                  {selectedMeta && (
                    <div className="p-4 rounded-lg flex items-center gap-3" style={{ background: 'var(--paper-2)', border: '1.5px dashed var(--line-md)' }}>
                      <span className="text-lg">{selectedMeta.requiresBack ? '📋' : '📄'}</span>
                      <div>
                        <p className="text-xs font-mono font-bold" style={{ color: 'var(--ink-2)' }}>{selectedMeta.label}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{selectedMeta.requiresBack ? 'Requires front + back scan' : 'Front scan only'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 gap-3" style={{ borderTop: '1.5px solid var(--line)' }}>
                    <button className="btn-ghost flex-1 sm:flex-none" onClick={() => { setErrors({}); setStep(2) }}>← Back</button>
                    <button className="btn-primary grow sm:flex-none" onClick={() => { if (validateStep3()) setStep(4) }}>Proceed to Live Scans →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: CAMERA SCANS (was step 2) ── */}
              {step === 4 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <p className="section-heading">Live Hardware Scans</p>

                  {/* ID Front */}
                  <div className={`scan-box p-4 ${errors.idFront ? 'error' : ''}`}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-2)' }}>1. ID FRONT</span>
                      {idFrontPreview && <span className="text-xs font-mono font-semibold" style={{ color: 'var(--teal)' }}>✓ CAPTURED</span>}
                    </div>
                    {idFrontPreview ? (
                      <div className="relative">
                        <img src={idFrontPreview} alt="ID Front" className="w-full h-44 object-cover rounded-xl" style={{ border: '1.5px solid var(--line-md)' }} />
                        <button type="button" onClick={() => startCamera('idFront')} className="absolute bottom-3 right-3 text-xs px-3.5 py-2 rounded-lg font-mono font-medium" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>🔄 Retake</button>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <button type="button" onClick={() => startCamera('idFront')} className="btn-primary dark w-full sm:w-auto">📷 Scan Front</button>
                      </div>
                    )}
                    <ErrMsg k="idFront" />
                  </div>

                  {/* ID Back */}
                  {selectedMeta?.requiresBack && (
                    <div className={`scan-box p-4 ${errors.idBack ? 'error' : ''}`}>
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-2)' }}>2. ID BACK</span>
                        {idBackPreview && <span className="text-xs font-mono font-semibold" style={{ color: 'var(--teal)' }}>✓ CAPTURED</span>}
                      </div>
                      {idBackPreview ? (
                        <div className="relative">
                          <img src={idBackPreview} alt="ID Back" className="w-full h-44 object-cover rounded-xl" style={{ border: '1.5px solid var(--line-md)' }} />
                          <button type="button" onClick={() => startCamera('idBack')} className="absolute bottom-3 right-3 text-xs px-3.5 py-2 rounded-lg font-mono font-medium" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>🔄 Retake</button>
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <button type="button" onClick={() => startCamera('idBack')} className="btn-primary dark w-full sm:w-auto">📷 Scan Back</button>
                        </div>
                      )}
                      <ErrMsg k="idBack" />
                    </div>
                  )}

                  {/* Selfie */}
                  <div className={`scan-box p-4 ${errors.face ? 'error' : ''}`}>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--ink-2)' }}>{selectedMeta?.requiresBack ? '3.' : '2.'} BIOMETRIC SELFIE</span>
                      {facePreview && <span className="text-xs font-mono font-semibold" style={{ color: 'var(--teal)' }}>✓ VERIFIED</span>}
                    </div>
                    {facePreview ? (
                      <div className="relative">
                        <img src={facePreview} alt="Selfie" className="w-full h-52 object-cover rounded-xl" style={{ border: '1.5px solid var(--line-md)' }} />
                        <button type="button" onClick={() => startCamera('face')} className="absolute bottom-3 right-3 text-xs px-3.5 py-2 rounded-lg font-mono font-medium" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>🔄 Retake</button>
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <button type="button" onClick={() => startCamera('face')} className="btn-primary w-full sm:w-auto">🛡️ Biometric Scan</button>
                      </div>
                    )}
                    <ErrMsg k="face" />
                  </div>

                  <div className="flex items-center justify-between pt-3 gap-3" style={{ borderTop: '1.5px solid var(--line)' }}>
                    <button className="btn-ghost flex-1 sm:flex-none" onClick={() => { setErrors({}); setStep(3) }}>← Back</button>
                    <button className="btn-primary grow sm:flex-none" onClick={() => { if (validateStep4()) setStep(5) }}>Review Disclosures →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 5: LEGAL (was step 3) ── */}
              {step === 5 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <p className="section-heading">Legal Disclosures</p>

                  {[
                    {
                      key: 'privacy', checked: privacyConsent, toggle: () => { setPrivacyConsent(v => !v); setGlobalError('') },
                      title: 'Data Privacy Act Consent (R.A. 10173)',
                      body: 'I explicitly consent to LenditBe collecting and processing my live government ID scans and facial biometric frame to verify my identity and prevent identity theft.',
                    },
                    {
                      key: 'credit', checked: creditConsent, toggle: () => { setCreditConsent(v => !v); setGlobalError('') },
                      title: 'Credit Inquiry Authorization',
                      body: 'I authorize LenditBe to conduct background and credit checks through accredited reporting bureaus to establish my allowance tier or debt-to-income capacity.',
                    },
                  ].map(item => (
                    <div key={item.key} className="p-4 rounded-xl cursor-pointer flex items-start gap-3.5 transition-all" onClick={item.toggle}
                      style={{ border: `1.5px solid ${item.checked ? 'var(--teal)' : 'var(--line-md)'}`, background: item.checked ? 'var(--teal-bg)' : 'var(--paper-2)' }}>
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ border: `1.5px solid ${item.checked ? 'var(--teal-dark)' : 'var(--line-md)'}`, background: item.checked ? 'var(--teal)' : 'var(--card)', color: '#fff' }}>
                        {item.checked && <span className="text-[10px] font-bold">✓</span>}
                      </div>
                      <div>
                        <strong className="text-xs font-bold block font-mono uppercase tracking-wide mb-0.5" style={{ color: 'var(--ink)' }}>{item.title}</strong>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>{item.body}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-3 gap-3" style={{ borderTop: '1.5px solid var(--line)' }}>
                    <button className="btn-ghost flex-1 sm:flex-none" disabled={loading} onClick={() => { setGlobalError(''); setStep(4) }}>← Back</button>
                    <button className="btn-primary grow sm:flex-none" disabled={loading || !privacyConsent || !creditConsent} onClick={handleSubmit}>
                      {loading ? 'Uploading...' : 'Submit Verification 🔒'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-[11px] font-mono mt-6 pb-8" style={{ color: 'var(--ink-4)' }}>
              256-BIT TLS ENCRYPTION // HARDWARE-ENFORCED LIVENESS
            </p>
          </div>
        </main>
      </div>
    </>
  )
}