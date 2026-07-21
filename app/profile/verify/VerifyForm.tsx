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

const PH_MOBILE = /^(09\d{9}|\+639\d{9})$/

const STEPS = [
  { num: 1, label: '01 / INFO'  },
  { num: 2, label: '02 / WORK'  },
  { num: 3, label: '03 / DOC'   },
  { num: 4, label: '04 / SCANS' },
  { num: 5, label: '05 / LEGAL' },
]

// ── Numeric / length bounds ──
const MAX_MONTHLY_INCOME  = 5_000_000   // ₱5,000,000 / month ceiling
const MIN_MONTHLY_INCOME  = 0
const MAX_NAME_LEN        = 50
const MAX_ADDRESS_LEN     = 120
const MAX_LOCALITY_LEN    = 60
const MAX_EMPLOYER_LEN    = 100
const MIN_AGE             = 18
const MAX_AGE             = 100
const MIN_BANK_ACCT_DIGITS = 6
const MAX_BANK_ACCT_DIGITS = 20

// ── Sanitizers / formatters ──
const onlyDigits = (v: string) => v.replace(/\D/g, '')

/** Digits + at most one decimal point, capped at 2 decimal places. Used for peso amounts. */
function sanitizeAmount(v: string) {
  let cleaned = v.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
  }
  const [intPart, decPart] = cleaned.split('.')
  const safeInt = (intPart ?? '').slice(0, 10) // guard against absurd digit counts
  return decPart !== undefined ? `${safeInt}.${decPart.slice(0, 2)}` : safeInt
}

/** PH mobile numbers: keeps a leading + (for +639...) and strips everything else non-numeric. */
function sanitizeMobile(v: string) {
  const hasPlus = v.trim().startsWith('+')
  const digits = onlyDigits(v)
  return hasPlus ? `+${digits.slice(0, 12)}` : digits.slice(0, 11)
}

function sanitizePostal(v: string) {
  return onlyDigits(v).slice(0, 4)
}

const trimmed = (v: string) => v.trim()

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
  // Address
  const [addressLine, setAddressLine] = useState('')
  const [barangay,    setBarangay]    = useState('')
  const [city,        setCity]        = useState('')
  const [province,    setProvince]    = useState('')
  const [postalCode,  setPostalCode]  = useState('')

  // Region → City → Barangay cascade
  const [region,           setRegion]           = useState('')
  const [selectedCityCode, setSelectedCityCode] = useState('')
  const [regionsList,      setRegionsList]      = useState<{ code: string; name: string }[]>([])
  const [citiesList,       setCitiesList]       = useState<{ code: string; name: string; provinceCode: string }[]>([])
  const [barangaysList,    setBarangaysList]    = useState<{ code: string; name: string }[]>([])
  const [loadingCities,    setLoadingCities]    = useState(false)
  const [loadingBrgy,      setLoadingBrgy]      = useState(false)

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
  // GCash / Maya are wallet numbers (PH mobile format); bank transfer is a numeric account number.
  const accountNumberKind: 'mobile' | 'bank' | 'free' =
    disbursementMethod === 'gcash' || disbursementMethod === 'maya' ? 'mobile'
    : disbursementMethod === 'bank_transfer' ? 'bank'
    : 'free'

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

  // Reset account number when the disbursement method changes shape (mobile vs bank format)
  useEffect(() => {
    setAccountNumber('')
    setErrors(prev => ({ ...prev, accountNumber: '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disbursementMethod])

  // Fetch regions once on mount
  useEffect(() => {
    fetch('https://psgc.gitlab.io/api/regions/')
      .then(r => r.json())
      .then((data: any[]) =>
        setRegionsList(data.map(r => ({ code: r.code, name: r.regionName ?? r.name })))
      )
      .catch(() => {})
  }, [])

  // When region changes → load cities/municipalities
  useEffect(() => {
    if (!region) { setCitiesList([]); setCity(''); setSelectedCityCode(''); setBarangay(''); setBarangaysList([]); return }
    setLoadingCities(true)
    setCitiesList([]); setCity(''); setSelectedCityCode(''); setBarangay(''); setBarangaysList([])
    fetch(`https://psgc.gitlab.io/api/regions/${region}/cities-municipalities/`)
      .then(r => r.json())
      .then((data: any[]) =>
        setCitiesList(
          data
            .map(c => ({ code: c.code, name: c.name, provinceCode: c.provinceCode ?? '' }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      )
      .catch(() => {})
      .finally(() => setLoadingCities(false))
  }, [region])

  // When city changes → load barangays + auto-fill province
  useEffect(() => {
    if (!selectedCityCode) { setBarangaysList([]); setBarangay(''); return }
    setLoadingBrgy(true)
    setBarangay(''); setBarangaysList([])

    const matched = citiesList.find(c => c.code === selectedCityCode)
    if (matched?.provinceCode) {
      fetch(`https://psgc.gitlab.io/api/provinces/${matched.provinceCode}/`)
        .then(r => r.json())
        .then((p: any) => setProvince(p.name ?? ''))
        .catch(() => {})
    } else {
      setProvince('')
    }

    fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCityCode}/barangays/`)
      .then(r => r.json())
      .then((data: any[]) =>
        setBarangaysList(
          data
            .map(b => ({ code: b.code, name: b.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      )
      .catch(() => {})
      .finally(() => setLoadingBrgy(false))
  }, [selectedCityCode])

  // ── Validators ──
  function validateStep1() {
    const e: Record<string, string> = {}
    const fn = firstName.trim(), ln = lastName.trim()
    if (!fn)                 e.firstName   = 'First name is required.'
    else if (fn.length > MAX_NAME_LEN) e.firstName = `Keep it under ${MAX_NAME_LEN} characters.`
    if (!ln)                 e.lastName    = 'Last name is required.'
    else if (ln.length > MAX_NAME_LEN) e.lastName = `Keep it under ${MAX_NAME_LEN} characters.`

    if (!birthDate)          e.birthDate   = 'Date of birth is required.'
    else {
      const parsed = new Date(birthDate)
      if (Number.isNaN(parsed.getTime())) {
        e.birthDate = 'Enter a valid date.'
      } else {
        const age = Math.floor((Date.now() - parsed.getTime()) / 31557600000)
        if (age < MIN_AGE) e.birthDate = `You must be at least ${MIN_AGE} years old.`
        else if (age > MAX_AGE) e.birthDate = 'Please double-check this date of birth.'
      }
    }
    if (!gender)             e.gender      = 'Please select a gender.'
    if (!civilStatus)        e.civilStatus = 'Please select civil status.'

    if (!region)             e.region      = 'Please select a region.'
    if (!mobile.trim())      e.mobile      = 'Mobile number is required.'
    else if (!PH_MOBILE.test(mobile))
      e.mobile = 'Enter a valid PH number (09XXXXXXXXX or +639XXXXXXXXX).'

    if (!addressLine.trim()) e.addressLine = 'House/unit/street is required.'
    else if (addressLine.trim().length > MAX_ADDRESS_LEN) e.addressLine = `Keep it under ${MAX_ADDRESS_LEN} characters.`
    if (!barangay.trim())    e.barangay    = 'Barangay is required.'
    if (!city.trim())        e.city        = 'City/municipality is required.'
    if (!province.trim())    e.province    = 'Province is required.'
    if (!postalCode.trim())  e.postalCode  = 'Postal code is required.'
    else if (!/^\d{4}$/.test(postalCode)) e.postalCode = 'Postal code must be exactly 4 digits.'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateIncome(value: string, label: string): string | null {
    if (!value.trim()) return `${label} is required.`
    const num = Number(value)
    if (!Number.isFinite(num) || num < MIN_MONTHLY_INCOME) return `Enter a valid ${label.toLowerCase()}.`
    if (num > MAX_MONTHLY_INCOME) return `${label} can't exceed ₱${MAX_MONTHLY_INCOME.toLocaleString()}.`
    return null
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    if (!employmentType) e.employmentType = 'Please select employment type.'

    if (isStudent) {
      if (!schoolName.trim())  e.schoolName    = 'School name is required.'
      else if (schoolName.trim().length > MAX_EMPLOYER_LEN) e.schoolName = `Keep it under ${MAX_EMPLOYER_LEN} characters.`

      if (!guardianName.trim()) e.guardianName  = 'Guardian name is required.'
      else if (guardianName.trim().length > MAX_NAME_LEN) e.guardianName = `Keep it under ${MAX_NAME_LEN} characters.`

      if (!guardianMobile.trim()) e.guardianMobile = 'Guardian mobile is required.'
      else if (!PH_MOBILE.test(guardianMobile)) e.guardianMobile = 'Enter a valid PH mobile number.'

      if (guardianIncome.trim()) {
        const incomeErr = validateIncome(guardianIncome, 'Guardian monthly income')
        if (incomeErr) e.guardianIncome = incomeErr
      }
    } else {
      const incomeErr = validateIncome(monthlyIncome, 'Monthly income')
      if (incomeErr) e.monthlyIncome = incomeErr
    }

    if (!disbursementMethod)   e.disbursementMethod = 'Select a disbursement method.'

    if (!accountName.trim())   e.accountName        = 'Account name is required.'
    else if (accountName.trim().length > MAX_EMPLOYER_LEN) e.accountName = `Keep it under ${MAX_EMPLOYER_LEN} characters.`

    if (!accountNumber.trim()) {
      e.accountNumber = 'Account number is required.'
    } else if (accountNumberKind === 'mobile') {
      if (!PH_MOBILE.test(accountNumber)) e.accountNumber = 'Enter a valid 09XXXXXXXXX wallet number.'
    } else if (accountNumberKind === 'bank') {
      const digits = onlyDigits(accountNumber)
      if (digits.length < MIN_BANK_ACCT_DIGITS || digits.length > MAX_BANK_ACCT_DIGITS)
        e.accountNumber = `Account number should be ${MIN_BANK_ACCT_DIGITS}-${MAX_BANK_ACCT_DIGITS} digits.`
    }

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
    fd.set('first_name', firstName.trim()); fd.set('middle_name', middleName.trim()); fd.set('last_name', lastName.trim())
    fd.set('suffix', suffix); fd.set('birth_date', birthDate); fd.set('gender', gender)
    fd.set('civil_status', civilStatus); fd.set('mobile_number', mobile)
    fd.set('address_line', addressLine.trim()); fd.set('barangay', barangay.trim()); fd.set('city', city.trim())
    fd.set('province', province.trim()); fd.set('postal_code', postalCode)
    fd.set('region', region)
    fd.set('employment_type', employmentType); fd.set('employer_name', employerName.trim())
    fd.set('monthly_income', monthlyIncome); fd.set('school_name', schoolName.trim())
    fd.set('guardian_name', guardianName.trim()); fd.set('guardian_mobile', guardianMobile)
    fd.set('guardian_monthly_income', guardianIncome)
    fd.set('disbursement_method', disbursementMethod)
    fd.set('disbursement_account_name', accountName.trim()); fd.set('disbursement_account_number', accountNumber)
    fd.set('id_type', idType); fd.set('id_number', idNumber.trim().toUpperCase())
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
    errors[k] ? <span id={`${k}-error`} role="alert" className="text-xs mt-1.5 block font-medium" style={{ color: 'var(--magenta)' }}>{errors[k]}</span> : null

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
        .field-hint { font-size:11px; color:var(--ink-4); margin-top:6px; display:block; }
        .field-input { width:100%; padding:12px 14px; border-radius:4px; border:1.5px solid var(--line-md); background:var(--paper-2); color:var(--ink); font-size:15px; font-weight:500; transition:all .2s ease; outline:none; box-sizing:border-box; font-family:'Inter',sans-serif; }
        .field-input:focus { border-color:var(--teal); background:var(--card); box-shadow:0 0 0 3px var(--teal-bg); }
        .field-input.error { border-color:var(--magenta); background:var(--magenta-bg); }
        .field-input:disabled { opacity:.55; cursor:not-allowed; }
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
        .btn-ghost:disabled { opacity:.5; cursor:not-allowed; }
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
                      <input
                        className={`field-input ${errors.firstName ? 'error' : ''}`}
                        value={firstName}
                        onChange={e => setFirstName(e.target.value.slice(0, MAX_NAME_LEN))}
                        onBlur={() => setFirstName(v => v.trim())}
                        maxLength={MAX_NAME_LEN}
                        autoComplete="given-name"
                        aria-invalid={!!errors.firstName}
                        aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                        placeholder="Juan"
                      />
                      <ErrMsg k="firstName" />
                    </div>
                    <div>
                      <label className="field-label">Last Name *</label>
                      <input
                        className={`field-input ${errors.lastName ? 'error' : ''}`}
                        value={lastName}
                        onChange={e => setLastName(e.target.value.slice(0, MAX_NAME_LEN))}
                        onBlur={() => setLastName(v => v.trim())}
                        maxLength={MAX_NAME_LEN}
                        autoComplete="family-name"
                        aria-invalid={!!errors.lastName}
                        aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                        placeholder="dela Cruz"
                      />
                      <ErrMsg k="lastName" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Middle Name</label>
                      <input
                        className="field-input"
                        value={middleName}
                        onChange={e => setMiddleName(e.target.value.slice(0, MAX_NAME_LEN))}
                        onBlur={() => setMiddleName(v => v.trim())}
                        maxLength={MAX_NAME_LEN}
                        autoComplete="additional-name"
                        placeholder="Santos (optional)"
                      />
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
                      <input
                        type="date"
                        className={`field-input ${errors.birthDate ? 'error' : ''}`}
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        min="1925-01-01"
                        autoComplete="bday"
                        aria-invalid={!!errors.birthDate}
                        aria-describedby={errors.birthDate ? 'birthDate-error' : undefined}
                      />
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
                      <input
                        type="tel"
                        inputMode="tel"
                        className={`field-input font-mono ${errors.mobile ? 'error' : ''}`}
                        value={mobile}
                        onChange={e => setMobile(sanitizeMobile(e.target.value))}
                        maxLength={13}
                        autoComplete="tel"
                        aria-invalid={!!errors.mobile}
                        aria-describedby={errors.mobile ? 'mobile-error' : undefined}
                        placeholder="09XXXXXXXXX"
                      />
                      <ErrMsg k="mobile" />
                    </div>
                  </div>

                 <p className="section-heading" style={{ marginTop: 8 }}>Home Address</p>

                  <div>
                    <label className="field-label">House No. / Unit / Street *</label>
                    <input
                      className={`field-input ${errors.addressLine ? 'error' : ''}`}
                      value={addressLine}
                      onChange={e => setAddressLine(e.target.value.slice(0, MAX_ADDRESS_LEN))}
                      onBlur={() => setAddressLine(v => v.trim())}
                      maxLength={MAX_ADDRESS_LEN}
                      autoComplete="address-line1"
                      aria-invalid={!!errors.addressLine}
                      aria-describedby={errors.addressLine ? 'addressLine-error' : undefined}
                      placeholder="123 Rizal St."
                    />
                    <ErrMsg k="addressLine" />
                  </div>

                  <div>
                    <label className="field-label">Region *</label>
                    <select
                      className={`field-input ${errors.region ? 'error' : ''}`}
                      value={region}
                      onChange={e => setRegion(e.target.value)}
                      disabled={regionsList.length === 0}
                    >
                      <option value="">{regionsList.length === 0 ? 'Loading regions…' : 'Select region…'}</option>
                      {regionsList.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                    <ErrMsg k="region" />
                  </div>

                  <div>
                    <label className="field-label">City / Municipality *</label>
                    <select
                      className={`field-input ${errors.city ? 'error' : ''}`}
                      value={selectedCityCode}
                      onChange={e => {
                        setSelectedCityCode(e.target.value)
                        const found = citiesList.find(c => c.code === e.target.value)
                        setCity(found?.name ?? '')
                      }}
                      disabled={!region || loadingCities}
                    >
                      <option value="">
                        {!region ? 'Select a region first' : loadingCities ? 'Loading cities…' : 'Select city / municipality…'}
                      </option>
                      {citiesList.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <ErrMsg k="city" />
                  </div>

                  <div>
                    <label className="field-label">Barangay *</label>
                    <select
                      className={`field-input ${errors.barangay ? 'error' : ''}`}
                      value={barangay}
                      onChange={e => setBarangay(e.target.value)}
                      disabled={!selectedCityCode || loadingBrgy}
                    >
                      <option value="">
                        {!selectedCityCode ? 'Select a city first' : loadingBrgy ? 'Loading barangays…' : 'Select barangay…'}
                      </option>
                      {barangaysList.map(b => <option key={b.code} value={b.name}>{b.name}</option>)}
                    </select>
                    <ErrMsg k="barangay" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Province</label>
                      <input
                        className="field-input"
                        value={province}
                        onChange={e => setProvince(e.target.value)}
                        placeholder="Auto-filled from city"
                      />
                    </div>
                    <div>
                      <label className="field-label">Postal Code *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={`field-input font-mono ${errors.postalCode ? 'error' : ''}`}
                        value={postalCode}
                        onChange={e => setPostalCode(sanitizePostal(e.target.value))}
                        maxLength={4}
                        autoComplete="postal-code"
                        aria-invalid={!!errors.postalCode}
                        aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
                        placeholder="1100"
                      />
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
                        <input
                          className={`field-input ${errors.schoolName ? 'error' : ''}`}
                          value={schoolName}
                          onChange={e => setSchoolName(e.target.value.slice(0, MAX_EMPLOYER_LEN))}
                          onBlur={() => setSchoolName(v => v.trim())}
                          maxLength={MAX_EMPLOYER_LEN}
                          placeholder="University of the Philippines"
                        />
                        <ErrMsg k="schoolName" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="field-label">Guardian Name *</label>
                          <input
                            className={`field-input ${errors.guardianName ? 'error' : ''}`}
                            value={guardianName}
                            onChange={e => setGuardianName(e.target.value.slice(0, MAX_NAME_LEN))}
                            onBlur={() => setGuardianName(v => v.trim())}
                            maxLength={MAX_NAME_LEN}
                            placeholder="Full name"
                          />
                          <ErrMsg k="guardianName" />
                        </div>
                        <div>
                          <label className="field-label">Guardian Mobile *</label>
                          <input
                            type="tel"
                            inputMode="tel"
                            className={`field-input font-mono ${errors.guardianMobile ? 'error' : ''}`}
                            value={guardianMobile}
                            onChange={e => setGuardianMobile(sanitizeMobile(e.target.value))}
                            maxLength={13}
                            placeholder="09XXXXXXXXX"
                          />
                          <ErrMsg k="guardianMobile" />
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Guardian Monthly Income</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`field-input ${errors.guardianIncome ? 'error' : ''}`}
                          value={guardianIncome}
                          onChange={e => setGuardianIncome(sanitizeAmount(e.target.value))}
                          placeholder="0.00"
                        />
                        <span className="field-hint">₱ pesos · up to ₱{MAX_MONTHLY_INCOME.toLocaleString()}</span>
                        <ErrMsg k="guardianIncome" />
                      </div>
                    </>
                  ) : employmentType && employmentType !== 'unemployed' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="field-label">{employmentType === 'business_owner' ? 'Business Name' : 'Employer Name'}</label>
                        <input
                          className="field-input"
                          value={employerName}
                          onChange={e => setEmployerName(e.target.value.slice(0, MAX_EMPLOYER_LEN))}
                          onBlur={() => setEmployerName(v => v.trim())}
                          maxLength={MAX_EMPLOYER_LEN}
                          placeholder="Company / Business"
                        />
                      </div>
                      <div>
                        <label className="field-label">Monthly Income *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`field-input ${errors.monthlyIncome ? 'error' : ''}`}
                          value={monthlyIncome}
                          onChange={e => setMonthlyIncome(sanitizeAmount(e.target.value))}
                          placeholder="0.00"
                          aria-invalid={!!errors.monthlyIncome}
                          aria-describedby={errors.monthlyIncome ? 'monthlyIncome-error' : undefined}
                        />
                        <span className="field-hint">₱ pesos · up to ₱{MAX_MONTHLY_INCOME.toLocaleString()}</span>
                        <ErrMsg k="monthlyIncome" />
                      </div>
                    </div>
                  ) : employmentType === 'unemployed' ? (
                    <div>
                      <label className="field-label">Monthly Income *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`field-input ${errors.monthlyIncome ? 'error' : ''}`}
                        value={monthlyIncome}
                        onChange={e => setMonthlyIncome(sanitizeAmount(e.target.value))}
                        placeholder="0.00"
                      />
                      <span className="field-hint">Allowance / support received, in pesos</span>
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
                      <input
                        className={`field-input ${errors.accountName ? 'error' : ''}`}
                        value={accountName}
                        onChange={e => setAccountName(e.target.value.slice(0, MAX_EMPLOYER_LEN))}
                        onBlur={() => setAccountName(v => v.trim())}
                        maxLength={MAX_EMPLOYER_LEN}
                        placeholder="As registered"
                      />
                      <ErrMsg k="accountName" />
                    </div>
                    <div>
                      <label className="field-label">
                        {accountNumberKind === 'mobile' ? 'Wallet Number *' : accountNumberKind === 'bank' ? 'Account Number *' : 'Account Number *'}
                      </label>
                      <input
                        type="text"
                        inputMode={accountNumberKind === 'free' ? 'text' : 'numeric'}
                        className={`field-input font-mono ${errors.accountNumber ? 'error' : ''}`}
                        value={accountNumber}
                        onChange={e => {
                          const raw = e.target.value
                          if (accountNumberKind === 'mobile') setAccountNumber(sanitizeMobile(raw))
                          else if (accountNumberKind === 'bank') setAccountNumber(onlyDigits(raw).slice(0, MAX_BANK_ACCT_DIGITS))
                          else setAccountNumber(raw.slice(0, MAX_BANK_ACCT_DIGITS))
                        }}
                        disabled={!disbursementMethod}
                        maxLength={accountNumberKind === 'mobile' ? 13 : MAX_BANK_ACCT_DIGITS}
                        placeholder={accountNumberKind === 'mobile' ? '09XXXXXXXXX' : accountNumberKind === 'bank' ? 'Digits only' : 'Reference / acct no.'}
                        aria-invalid={!!errors.accountNumber}
                        aria-describedby={errors.accountNumber ? 'accountNumber-error' : undefined}
                      />
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
                    <select
                      className={`field-input ${errors.idType ? 'error' : ''}`}
                      value={idType}
                      onChange={e => { setIdType(e.target.value); setIdNumber(''); setErrors(prev => ({ ...prev, idType: '', idNumber: '' })) }}
                    >
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
                    <input
                      type="text"
                      className={`field-input font-mono uppercase ${errors.idNumber ? 'error' : ''}`}
                      placeholder={selectedMeta?.hint ?? 'Enter exact document number'}
                      value={idNumber}
                      maxLength={selectedMeta ? selectedMeta.mask.length : 30}
                      disabled={!idType}
                      onChange={e => {
                        setIdNumber(e.target.value.toUpperCase().slice(0, selectedMeta ? selectedMeta.mask.length : 30))
                        setErrors(prev => ({ ...prev, idNumber: '' }))
                      }}
                      aria-invalid={!!errors.idNumber}
                      aria-describedby={errors.idNumber ? 'idNumber-error' : undefined}
                    />
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
                    <div key={item.key} role="checkbox" aria-checked={item.checked} tabIndex={0}
                      onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); item.toggle() } }}
                      className="p-4 rounded-xl cursor-pointer flex items-start gap-3.5 transition-all" onClick={item.toggle}
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