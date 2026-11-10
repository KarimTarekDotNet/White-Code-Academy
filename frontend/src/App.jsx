import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowUpLeft, BookOpen, Check, ChevronLeft, ChevronRight, CircleAlert, Code2,
  FileText, GraduationCap, KeyRound, Layers3, LogOut, MonitorPlay, Pencil, Plus,
  RefreshCw, Search, Settings, ShieldCheck, Sparkles, Terminal, Trash2, Upload,
  UserCog, UserPlus, Users, X,
} from 'lucide-react'
import { ApiError, WhiteCodeApi, getRoles } from './api'

const pageSize = 8

// Small, dependency-free interface copy layer. Content coming from the API is left
// untouched, while every control and system message can follow the user's setting.
let activeLocale = 'ar'
const t = (arabic, english) => activeLocale === 'en' ? english : arabic

const cleanObject = (values) => Object.fromEntries(
  Object.entries(values).filter(([, value]) => value !== '' && value !== undefined && value !== null),
)

const createFormData = (values) => {
  const formData = new FormData()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) formData.append(key, value)
  })
  return formData
}

const FRONTEND_PREFERENCES_KEY = 'whitecode-frontend-preferences'
const defaultPreferences = { theme: 'light', locale: 'ar', density: 'comfortable', motion: true }
const readPreferences = () => {
  try { return { ...defaultPreferences, ...JSON.parse(localStorage.getItem(FRONTEND_PREFERENCES_KEY) || '{}') } } catch { return defaultPreferences }
}
const formatDate = (value) => value ? new Intl.DateTimeFormat(activeLocale === 'en' ? 'en-US' : 'ar-EG', { dateStyle: 'medium' }).format(new Date(value)) : '—'
const friendlyError = (error) => {
  if (!(error instanceof ApiError)) return t('حدث خطأ مؤقت. حاول مرة أخرى بعد لحظات.', 'A temporary issue occurred. Please try again in a moment.')
  if (error.status === 0) return t('تعذر الاتصال بالخدمة الآن. تحقق من اتصالك وحاول مرة أخرى.', 'We could not reach the service. Check your connection and try again.')
  if (error.status === 401) return t('سجّل الدخول أولًا للمتابعة.', 'Sign in first to continue.')
  if (error.status === 403) return t('لا تملك الصلاحية لإتمام هذه العملية.', 'You do not have permission for this action.')
  if (error.status === 404) return t('العنصر المطلوب لم يعد متاحًا.', 'The requested item is no longer available.')
  if (error.status === 409) return t('لا يمكن إتمام العملية بالحالة الحالية للبيانات.', 'This action cannot be completed with the current data state.')
  if (error.status === 422) return t('راجع الحقول المطلوبة ثم حاول مرة أخرى.', 'Review the required fields and try again.')
  return t('تعذر إتمام العملية الآن. حاول مرة أخرى لاحقًا.', 'We could not complete the action right now. Please try again later.')
}

function AmbientScene() {
  const sceneRef = useRef(null)
  const pointerRef = useRef({ x: 0, y: 0, isOver: false })

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || typeof window === 'undefined') return undefined

    const elements = {
      orb: scene.querySelector('.ambient-orb'),
      cube: scene.querySelector('.ambient-cube'),
      ring: scene.querySelector('.ambient-ring'),
      sphere: scene.querySelector('.ambient-sphere'),
      pyramid: scene.querySelector('.ambient-pyramid'),
      cylinder: scene.querySelector('.ambient-cylinder'),
    }
    let animationFrameId

    const handlePointerMove = (event) => {
      pointerRef.current = {
        x: event.clientX - window.innerWidth / 2,
        y: event.clientY - window.innerHeight / 2,
        isOver: true,
      }
    }
    const clearPointer = () => { pointerRef.current = { x: 0, y: 0, isOver: false } }

    const animate = () => {
      const { x, y, isOver } = pointerRef.current
      const moveFactor = isOver ? 0.02 : 0.005
      const xMove = x * moveFactor
      const yMove = y * moveFactor

      if (elements.orb) elements.orb.style.transform = `translate3d(${xMove}px, ${yMove}px, 0) rotateY(${xMove * 0.1}deg)`
      if (elements.cube) elements.cube.style.transform = `translate3d(${xMove * 0.5}px, ${yMove * 0.5}px, 0) rotateX(${yMove * 0.1}deg) rotateY(${xMove * 0.1}deg)`
      if (elements.ring) elements.ring.style.transform = `translate3d(${xMove * 0.3}px, ${yMove * 0.3}px, 0) rotateZ(${xMove * 0.05}deg)`
      if (elements.sphere) elements.sphere.style.transform = `translate3d(${xMove * 0.7}px, ${yMove * 0.7}px, 0) rotateY(${xMove * 0.15}deg)`
      if (elements.pyramid) elements.pyramid.style.transform = `translate3d(${xMove * 0.4}px, ${yMove * 0.4}px, 0) rotateX(${yMove * 0.1}deg) rotateZ(${xMove * 0.1}deg)`
      if (elements.cylinder) elements.cylinder.style.transform = `translate3d(${xMove * 0.6}px, ${yMove * 0.6}px, 0) rotateZ(${xMove * 0.1}deg)`

      animationFrameId = window.requestAnimationFrame(animate)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('blur', clearPointer)
    animate()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('blur', clearPointer)
    }
  }, [])

  return (
    <div
      ref={sceneRef}
      className="ambient-scene"
      aria-hidden="true"
    >
      <span className="ambient-orb" />
      <span className="ambient-cube" />
      <span className="ambient-ring" />
      <span className="ambient-grid" />
      {/* Additional 3D elements for enhanced depth */}
      <span className="ambient-sphere" />
      <span className="ambient-pyramid" />
      <span className="ambient-cylinder" />
    </div>
  )
}

function Notice({ notice, onClose }) {
  const [displayNotice, setDisplayNotice] = useState(notice)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (notice) { setDisplayNotice(notice); setLeaving(false); return undefined }
    if (!displayNotice) return undefined
    setLeaving(true)
    const timer = setTimeout(() => setDisplayNotice(null), 280)
    return () => clearTimeout(timer)
  }, [notice, displayNotice])
  if (!displayNotice) return null
  return (
    <div className={`notice ${displayNotice.type === 'error' ? 'notice-error' : ''} ${leaving ? 'notice-leaving' : ''}`} role="status">
      {displayNotice.type === 'error' ? <CircleAlert size={18} /> : <Check size={18} />}
      <span>{displayNotice.message}</span>
      <button aria-label={t('إغلاق التنبيه', 'Close notification')} className="icon-button" onClick={onClose}><X size={16} /></button>
    </div>
  )
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label={t('إغلاق', 'Close')}><X /></button></header>
        {children}
      </section>
    </div>
  )
}

function Button({ children, className = '', loading, type = 'button', ...props }) {
  return <button type={type} className={`button ${className}`} disabled={loading || props.disabled} {...props}>{loading ? t('جارٍ التنفيذ…', 'Working…') : children}</button>
}

function Field({ label, hint, children }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

function Pagination({ page, itemCount, onPageChange, label = t('النتائج', 'results') }) {
  const hasNext = itemCount === pageSize
  return <nav className="pagination" aria-label={`${t('صفحات', 'Pages')} ${label}`}>
    <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronRight size={17} /> {t('السابق', 'Previous')}</button>
    <span>{t('صفحة', 'Page')} <strong>{page}</strong></span>
    <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>{t('التالي', 'Next')} <ChevronLeft size={17} /></button>
  </nav>
}

function SearchPicker({ label, hint, value, selectedLabel, onChange, fetchItems, getLabel, required = false, emptyLabel = t('لا توجد نتائج', 'No results found') }) {
  const [term, setTerm] = useState('')
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await fetchItems({ pageNumber: page, pageSize, wordForSearch: term || '%', sortBy: 'name' })
        setItems(data || [])
      } catch (error) {
        if (error?.name !== 'AbortError') setItems([])
      } finally { setLoading(false) }
    }, term ? 220 : 0)
    return () => { controller.abort(); clearTimeout(timeout) }
  }, [fetchItems, open, page, term])

  const choose = (item) => {
    onChange(item)
    setTerm(getLabel(item)); setOpen(false)
  }
  const clear = () => {
    onChange(null); setTerm(''); setPage(1); setOpen(true)
  }

  return <div className="field picker-field"><span>{label}</span>
    <div className="search-picker">
      <Search size={17} aria-hidden="true" />
      <input value={open ? term : (selectedLabel || term)} placeholder={`${t('ابحث واختر', 'Search and choose')} ${label}…`} onFocus={() => { setOpen(true); setPage(1) }} onChange={(event) => { setTerm(event.target.value); setPage(1); if (value) onChange(null) }} />
      {value && <button className="picker-clear" type="button" onClick={clear} aria-label={`${t('إزالة', 'Remove')} ${label}`}><X size={15} /></button>}
      <input className="visually-hidden" value={value || ''} onChange={() => {}} required={required} tabIndex={-1} aria-hidden="true" />
      {open && <div className="picker-menu">
        <div className="picker-menu-caption">{loading ? t('جارٍ البحث…', 'Searching…') : t('نتائج مطابقة', 'Matching results')}</div>
        {items.length ? items.map((item) => <button type="button" key={item.id || item.userId || getLabel(item)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><strong>{getLabel(item)}</strong><span className="mono">{t('اختيار', 'Select')}</span></button>) : !loading && <p>{emptyLabel}</p>}
        <Pagination page={page} itemCount={items.length} onPageChange={setPage} label={label} />
      </div>}
    </div>
    {hint && <small>{hint}</small>}
  </div>
}

function MissingData({ title, detail, endpoint }) {
  return <section className="missing-data reveal"><span className="eyebrow">بيانات مطلوبة من الـ API</span><h2>{title}</h2><p>{detail}</p>{endpoint && <code>{endpoint}</code>}</section>
}

function Empty({ title, detail }) {
  return <div className="empty"><div className="empty-mark">—</div><h3>{title}</h3><p>{detail}</p></div>
}


function ApiSettings({ api, preferences, onPreferencesChange, onSaved, onClose }) {
  const [url, setUrl] = useState(api.baseUrl)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState('')

  const save = (event) => {
    event.preventDefault()
    try {
      api.configureBaseUrl(url)
      onSaved()
      onClose()
    } catch (error) {
      setStatus(friendlyError(error))
    }
  }

  const checkConnection = async () => {
    setChecking(true)
    setStatus('')
    try {
      const current = api.baseUrl
      api.configureBaseUrl(url)
      await api.getLiveness()
      setStatus(t('تم الاتصال بالخدمة بنجاح.', 'Connected to the service successfully.'))
      if (current !== api.baseUrl) onSaved()
    } catch (error) {
      setStatus(friendlyError(error))
    } finally {
      setChecking(false)
    }
  }

  return <Modal title={t('إعدادات الواجهة', 'Interface settings')} onClose={onClose}>
    <form onSubmit={save} className="settings-form">
      <div className="settings-header">
        <h2>{t('الإعدادات', 'Settings')}</h2>
        <p>{t('ضبط تفضيلاتك لتخصيص تجربة WhiteCode Academy', 'Adjust your preferences to customize your WhiteCode Academy experience')}</p>
      </div>

      <div className="settings-section">
        <h3>{t('المظهر', 'Appearance')}</h3>
        <div className="settings-grid">
          <div className="setting-item">
            <label>{t('الوضع', 'Theme')}</label>
            <div className="setting-control">
              <button
                type="button"
                className={preferences.theme === 'light' ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, theme: 'light' })}
              >
                {t('فاتح', 'Light')}
              </button>
              <button
                type="button"
                className={preferences.theme === 'dark' ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, theme: 'dark' })}
              >
                {t('داكن', 'Dark')}
              </button>
            </div>
          </div>
          <div className="setting-item">
            <label>{t('كثافة العرض', 'Display density')}</label>
            <div className="setting-control">
              <button
                type="button"
                className={preferences.density === 'comfortable' ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, density: 'comfortable' })}
              >
                {t('مريح', 'Comfortable')}
              </button>
              <button
                type="button"
                className={preferences.density === 'compact' ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, density: 'compact' })}
              >
                {t('مضغوط', 'Compact')}
              </button>
            </div>
          </div>
          <div className="setting-item">
            <label>{t('الحركة', 'Motion')}</label>
            <div className="setting-control">
              <button
                type="button"
                className={preferences.motion ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, motion: true })}
              >
                {t('تشغيل', 'On')}
              </button>
              <button
                type="button"
                className={!preferences.motion ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, motion: false })}
              >
                {t('إيقاف', 'Off')}
              </button>
            </div>
          </div>
          <div className="setting-item">
            <label>{t('لغة الواجهة', 'Interface language')}</label>
            <div className="setting-control">
              <button
                type="button"
                className={preferences.locale === 'ar' ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, locale: 'ar' })}
              >
                العربية
              </button>
              <button
                type="button"
                className={preferences.locale === 'en' ? 'active' : ''}
                onClick={() => onPreferencesChange({ ...preferences, locale: 'en' })}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t('إعداد API للمطورين', 'Developer API settings')}</h3>
        <p className="settings-description">{t('إعداد التطوير هذا مستقل عن إعدادات العرض أعلاه.', 'This development setting is separate from the interface preferences above.')}</p>
        <Field
          label={t('رابط الـ API الأساسي', 'API base address')}
          hint={t('مثال: https://localhost:7045 — لا تضف /api في النهاية.', 'Example: https://localhost:7045 — do not add /api at the end.')}
        >
          <input
            dir="ltr"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            className="api-input"
          />
        </Field>
        {status && <p className={status.startsWith(t('تم', 'Connected')) ? 'form-success' : 'form-error'}>{status}</p>}
        <div className="settings-actions">
          <Button
            className="button-secondary"
            loading={checking}
            onClick={checkConnection}
          >
            <RefreshCw size={17} /> {t('اختبار الاتصال', 'Test connection')}
          </Button>
          <Button
            type="submit"
            className="primary-button"
          >
            <Check size={17} /> {t('حفظ الرابط', 'Save address')}
          </Button>
        </div>
      </div>

      <div className="settings-actions">
        <Button
          className="button-secondary"
          onClick={onClose}
        >
          {t('إغلاق الإعدادات', 'Close settings')}
        </Button>
      </div>
    </form>
  </Modal>
}
function Header({ authenticated, roles, onNavigate, onLogout, onOpenSettings }) {
  return <header className="site-header">
    <button className="brand" onClick={() => onNavigate('/')} aria-label={t('الصفحة الرئيسية', 'Home page')}>
      <span className="brand-mark">W</span><span>WhiteCode<span className="brand-light">Academy</span></span>
    </button>
    <nav className="main-nav" aria-label={t('التنقل الرئيسي', 'Main navigation')}>
      <button onClick={() => onNavigate('/')}>{t('اكتشف الأكاديمية', 'Discover')}</button>
      <button onClick={() => onNavigate('/courses')}>{t('تصفح الدورات', 'Courses')}</button>
      <button onClick={() => onNavigate('/docs')}>{t('عن المنصة', 'Platform guide')}</button>
      {authenticated && <button onClick={() => onNavigate('/dashboard/courses')}>{t('مساحتي', 'My space')}</button>}
      {authenticated && roles.includes('Admin') && <button onClick={() => onNavigate('/dashboard/admin/departments')}>{t('الإدارة', 'Management')}</button>}
    </nav>
    <div className="header-actions">
      <button className="icon-button" aria-label={t('إعدادات الواجهة', 'Interface settings')} title={t('إعدادات الواجهة', 'Interface settings')} onClick={onOpenSettings}><Settings size={19} /></button>
      {authenticated ? <Button className="button-inverse button-compact" onClick={onLogout}><LogOut size={16} /> {t('خروج', 'Sign out')}</Button> : <Button className="button-inverse button-compact" onClick={() => onNavigate('/auth')}><ArrowLeft size={16} /> {t('دخول', 'Sign in')}</Button>}
    </div>
  </header>
}

function HomePage({ api, authenticated, onNavigate, showNotice }) {
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let current = true
    Promise.allSettled([
      api.getDepartments({ pageNumber: 1, pageSize, wordForSearch: '%', sortBy: 'name' }),
      api.getCourses({ pageNumber: 1, pageSize: 3, wordForSearch: '%', sortBy: 'name' }),
    ]).then(([departmentResult, courseResult]) => {
      if (!current) return
      if (departmentResult.status === 'fulfilled') setDepartments(departmentResult.value || [])
      else showNotice(friendlyError(departmentResult.reason), 'error')
      if (courseResult.status === 'fulfilled') setCourses(courseResult.value || [])
      else showNotice(friendlyError(courseResult.reason), 'error')
    })
      .finally(() => current && setLoading(false))
    return () => { current = false }
  }, [api, showNotice])

  return <main>
    <section className="hero">
      <div className="eyebrow">{t('منهج واضح · تعلّم مركز · تقدّم ملموس', 'Clear curriculum · focused learning · visible progress')}</div>
      <h1>{t(<>تعلّم البرمجة<br />بلا ضوضاء.</>, <>Learn to code<br />without the noise.</>)}</h1>
      <p>{t('مساحة تعليمية مباشرة تجمع الدورات، الدروس المسجّلة، وملفّك الأكاديمي في مكان واحد.', 'One focused learning space for courses, recorded lessons, and your academic profile.')}</p>
      <div className="hero-actions reveal reveal-delay-1">
        <Button onClick={() => onNavigate(authenticated ? '/dashboard/courses' : '/auth')}>{authenticated ? t('اذهب إلى مساحتي', 'Go to my space') : t('ابدأ حسابك', 'Create your account')} <ArrowLeft size={18} /></Button>
        <Button className="button-secondary" onClick={() => onNavigate('/courses')}>{t('تصفح الدورات', 'Browse courses')} <ArrowUpLeft size={17} /></Button>
      </div>
      <div className="hero-stats reveal reveal-delay-2"><span><strong>01</strong> {t('منصة واحدة', 'one platform')}</span><span><strong>02</strong> {t('أدوار واضحة', 'clear roles')}</span><span><strong>03</strong> {t('محتوى عملي', 'practical content')}</span></div>
    </section>
    <section className="platform-intro content-section reveal">
      <span className="eyebrow">{t('كيف تعمل WhiteCode', 'How WhiteCode works')}</span>
      <div className="platform-intro-layout"><h2>{t(<>تعلم. شاهد. طبّق.<br />ثم ارجع إلى المكان الذي توقفت عنده.</>, <>Learn. Watch. Build.<br />Return exactly where you left off.</>)}</h2><div><p>{t('المحتوى، التسجيلات، ودور كل مستخدم مرتبة حول رحلة واضحة بدل شاشات متفرقة. الطالب يتعلّم، المدرّس ينشر الدروس، والمدير يدير المنصة.', 'Content, enrollments, and each role are organised around one clear journey—not scattered screens. Students learn, instructors publish, and admins manage.')}</p><button className="inline-link" onClick={() => onNavigate('/docs')}>{t('دليل المنصة', 'Platform guide')} <ChevronLeft size={17} /></button></div></div>
    </section>
    <section className="home-courses content-section reveal">
      <div className="section-heading"><div><span className="eyebrow">{t('الدورات المفتوحة', 'Open catalogue')}</span><h2>{t('ابدأ بالفضول.', 'Start with curiosity.')}</h2></div><Button className="button-text" onClick={() => onNavigate('/courses')}>{t('كل الدورات', 'View all courses')} <ChevronLeft size={18} /></Button></div>
      {loading ? <div className="loading-block">{t('جارٍ تحضير الدورات…', 'Preparing courses…')}</div> : courses.length ? <div className="home-course-rail">{courses.map((course, index) => <button className="home-course-line" key={course.id} onClick={() => onNavigate(`/courses/${course.id}`)}><span className="mono">0{index + 1}</span><strong>{course.name}</strong><span>{course.totalSections} {t('دروس', 'lessons')}</span><ArrowUpLeft size={19} /></button>)}</div> : <Empty title={t('لا توجد دورات منشورة بعد', 'No published courses yet')} detail={t('ستظهر الدورات هنا فور إضافتها في الأكاديمية.', 'Courses will appear here as soon as they are added to the academy.')} />}
    </section>
    <section id="departments" className="content-section">
      <div className="section-heading"><div><span className="eyebrow">{t('الأقسام', 'Departments')}</span><h2>{t('اختر مسارك.', 'Choose your path.')}</h2></div>{authenticated && <Button className="button-text" onClick={() => onNavigate('/dashboard/courses')}>{t('كل الدورات', 'My courses')} <ChevronLeft size={18} /></Button>}</div>
      {loading ? <div className="loading-block">{t('جارٍ تحميل الأقسام…', 'Loading departments…')}</div> : departments.length ? <div className="department-grid">
        {departments.map((department, index) => <article className="department-card" key={department.id}>
          <div className="department-number">0{index + 1}</div>
          {department.imageUrl ? <img src={api.asset(department.imageUrl)} alt="" /> : <div className="department-image-placeholder"><BookOpen size={40} /></div>}
          <h3>{department.name}</h3><p>{department.description}</p>
        </article>)}
      </div> : <Empty title={t('لا توجد أقسام بعد', 'No departments yet')} detail={t('ستظهر الأقسام المنشأة من لوحة الإدارة هنا.', 'Departments created from management will appear here.')} />}
    </section>
  </main>
}

function DocsPage({ onNavigate, authenticated }) {
  return <main className="docs-page">
    <section className="docs-hero"><span className="eyebrow">WHITE CODE / DOCUMENTATION</span><h1>{t(<>منصة تعليم<br />تتحرك بخطوات واضحة.</>, <>A learning platform<br />with clear next steps.</>)}</h1><p>{t('هذا الدليل يشرح الرحلة داخل WhiteCode Academy: من اكتشاف التخصص وحتى متابعة الدروس وإدارة المحتوى.', 'This guide explains the WhiteCode Academy journey: from discovering a discipline to studying lessons and managing content.')}</p><div className="hero-actions"><Button onClick={() => onNavigate(authenticated ? '/dashboard/courses' : '/auth')}>{authenticated ? t('افتح مساحتي', 'Open my space') : t('أنشئ حسابًا', 'Create an account')} <ArrowLeft size={17} /></Button><button className="inline-link" onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}>{t('اعرف الأدوار', 'Explore roles')} <ChevronLeft size={17} /></button></div></section>
    <nav className="docs-jump-nav" aria-label={t('أقسام الدليل', 'Guide sections')}><a href="#start">{t('البداية', 'Start')}</a><a href="#roles">{t('الأدوار', 'Roles')}</a><a href="#learning">{t('التعلّم', 'Learning')}</a><a href="#management">{t('الإدارة', 'Management')}</a></nav>
    <section id="start" className="docs-section reveal"><span className="eyebrow">01 / {t('البداية', 'START')}</span><div className="docs-row"><h2>{t(<>حساب واحد،<br />مسار مفهوم.</>, <>One account,<br />a clear path.</>)}</h2><p>{t('أنشئ الحساب ثم أكّد البريد الإلكتروني. بعد تسجيل الدخول، تظهر لك مكتبة الدورات، وملفك الشخصي، والأدوات المطابقة لدورك.', 'Create an account and verify your email. Once signed in, you will have your course library, profile, and role-specific tools.')}</p></div></section>
    <section id="roles" className="docs-section roles-section reveal"><span className="eyebrow">02 / {t('الأدوار', 'ROLES')}</span><div className="role-lines"><article><strong>USER</strong><h3>{t('طالب', 'Student')}</h3><p>{t('يفعّل ملف الطالب، يسجّل في الدورات، ويتابع محتوى كل دورة.', 'Activates a student profile, enrols in courses, and studies each course.')}</p></article><article><strong>INSTRUCTOR</strong><h3>{t('مدرّس', 'Instructor')}</h3><p>{t('ينشئ الدورات التابعة له ويرفع الدروس وملفات PDF.', 'Creates assigned courses and uploads lessons and PDF files.')}</p></article><article><strong>ADMIN</strong><h3>{t('مدير', 'Admin')}</h3><p>{t('يدير الأقسام والمدرسين والتسجيلات وكل محتوى الأكاديمية.', 'Manages departments, instructors, enrolments, and all academy content.')}</p></article></div></section>
    <section id="learning" className="docs-section reveal"><span className="eyebrow">03 / {t('التعلّم', 'LEARNING')}</span><div className="docs-row"><h2>{t(<>ابحث مباشرة<br />وشاهد فورًا.</>, <>Search directly<br />and watch instantly.</>)}</h2><p>{t('تقوم صفحة الدورات بتحديث النتائج تلقائيًا أثناء الكتابة. افتح الدورة من رابط مستقل؛ لذلك أزرار الرجوع والتقدم في المتصفح تعيدك بالضبط إلى القائمة أو الدرس الذي زرته.', 'Course search updates while you type. Each course has its own URL, so browser back and forward take you exactly to the list or lesson you visited.')}</p></div></section>
    <section id="management" className="docs-section reveal"><span className="eyebrow">04 / {t('الإدارة', 'MANAGEMENT')}</span><div className="docs-row"><h2>{t(<>اختيارات بدل<br />معرّفات مبهمة.</>, <>Choose items,<br />not opaque IDs.</>)}</h2><p>{t('الاختيارات المرتبطة بالقسم أو المدرس أو الدورة تأتي من بحث مباشر في الـ API مع صفحات نتائج. لا ينبغي أن يكتب المدير معرّفًا يدويًا عندما يكون الـ endpoint المناسب متاحًا.', 'Department, instructor, and course choices come from live API search with paginated results. An admin should never type an opaque ID when the proper endpoint exists.')}</p></div></section>
    <section className="docs-cta reveal"><Code2 size={28} /><h2>{t('ابدأ من مكان واحد.', 'Start in one place.')}</h2><Button onClick={() => onNavigate(authenticated ? '/dashboard/courses' : '/auth')}>{t('الذهاب للمنصة', 'Go to the platform')} <ArrowLeft size={17} /></Button></section>
  </main>
}

function PublicCoursesPage({ api, courseId, onNavigate, showNotice }) {
  const [courses, setCourses] = useState([])
  const [course, setCourse] = useState(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const loadCourses = useCallback(async () => {
    setLoading(true)
    try { setCourses(await api.getCourses({ pageNumber: page, pageSize, wordForSearch: query || 'all', sortBy: 'name' }) || []) } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }, [api, page, query, showNotice])

  useEffect(() => { if (courseId) return undefined; const timer = setTimeout(loadCourses, query ? 220 : 0); return () => clearTimeout(timer) }, [courseId, loadCourses, query])
  useEffect(() => { setPage(1) }, [query])
  useEffect(() => {
    if (!courseId) { setCourse(null); return }
    let alive = true
    setLoading(true)
    api.getCourse(courseId).then((data) => alive && setCourse(data)).catch((error) => alive && showNotice(friendlyError(error), 'error')).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [api, courseId, showNotice])

  if (courseId) return <main className="public-catalog"><section className="public-course-detail reveal"><button className="back-link" onClick={() => onNavigate('/courses')}><ChevronRight size={17} /> {t('كل الدورات', 'All courses')}</button>{loading || !course ? <div className="loading-block">{t('جارٍ فتح الدورة…', 'Opening course…')}</div> : <><span className="eyebrow">OPEN CATALOGUE</span><h1>{course.name}</h1><p>{course.description}</p><div className="metadata"><span>{course.totalSections} {t('درس', 'lessons')}</span><span>{course.totalHours} {t('ساعة', 'hours')}</span></div><div className="catalog-lock"><MonitorPlay size={25} /><div><strong>{t('محتوى الدروس متاح بعد تسجيل الدخول.', 'Lesson content is available after you sign in.')}</strong><p>{t('أنشئ حساب طالب أو سجّل الدخول لمشاهدة الفيديوهات وملفات الدورة والتسجيل فيها.', 'Create a student account or sign in to watch videos, access course files, and enrol.')}</p></div><Button onClick={() => onNavigate('/auth')}>{t('دخول أو إنشاء حساب', 'Sign in or create an account')} <ArrowLeft size={17} /></Button></div></>}</section></main>

  return <main className="public-catalog"><section className="public-catalog-hero reveal"><span className="eyebrow">OPEN CATALOGUE</span><h1>{t('ابدأ بالفضول.', 'Start with curiosity.')}</h1><p>{t('تصفح كل الدورات بحرية، واقرأ تفاصيلها قبل إنشاء حسابك.', 'Browse every course freely and explore its details before creating an account.')}</p></section><section className="public-course-list"><div className="search-row"><Search size={20} /><input placeholder={t('ابحث باسم الدورة أو وصفها…', 'Search by course name or description…')} value={query} onChange={(event) => setQuery(event.target.value)} /><span>{courses.length} {t('نتيجة', 'results')}</span></div>{loading ? <div className="loading-block">{t('جارٍ تحميل الدورات…', 'Loading courses…')}</div> : courses.length ? <><div className="course-grid">{courses.map((item) => <button className="course-card" key={item.id} onClick={() => onNavigate(`/courses/${item.id}`)}><span className="course-index">CATALOGUE</span><h2>{item.name}</h2><p>{item.description}</p><div><span>{item.totalSections} {t('درس', 'lessons')}</span><span>{item.totalHours} {t('ساعة', 'hours')}</span><ChevronLeft size={19} /></div></button>)}</div><Pagination page={page} itemCount={courses.length} onPageChange={setPage} label={t('الدورات', 'courses')} /></> : <Empty title={t('لا توجد دورات مطابقة', 'No matching courses')} detail={t('جرّب كلمة بحث أخرى.', 'Try a different search term.')} />}</section></main>
}

function AuthPage({ api, onAuthenticated, onNavigate, showNotice }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [login, setLogin] = useState({ identity: '', password: '' })
  const [register, setRegister] = useState({ firstName: '', lastName: '', userName: '', email: '', password: '', confirmPassword: '' })
  const [email, setEmail] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')

  const submitLogin = async (event) => {
    event.preventDefault(); setLoading(true)
    try {
      const response = await api.login(login)
      api.setToken(response.accessToken)
      if (getRoles(response.accessToken).includes('User')) {
        try {
          const student = await api.assignStudent()
          api.setStudentId(student?.id)
        } catch (error) {
          // A 409 means the student profile already exists. Login should remain uninterrupted.
          if (!(error instanceof ApiError) || error.status !== 409) { /* Profile setup can be retried from the account page. */ }
        }
      }
      onAuthenticated()
      showNotice(t('تم تسجيل الدخول بنجاح.', 'Signed in successfully.'))
      onNavigate('/dashboard/courses')
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }
  const submitRegister = async (event) => {
    event.preventDefault(); setLoading(true)
    try {
      const response = await api.register(register)
      setRegisteredEmail(register.email)
      setEmail(register.email)
      setMode('verify')
      showNotice(t('تم إنشاء الحساب. افحص لتأكيده.', 'Your account has been created. Check your email to verify it.'))
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }
  const sendEmail = async (type) => {
    setLoading(true)
    try {
      const response = type === 'verify' ? await api.resendConfirmation(email) : await api.requestPasswordReset(email)
      showNotice(t('تم إرسال الرسالة.', 'The email has been sent.'))
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }

  return <main className="auth-layout">
    <section className="auth-aside"><div className="aside-index">01 / ACCESS</div><h1>{t(<>الكود يبدأ<br />بقرار واحد.</>, <>Code begins<br />with one decision.</>)}</h1><p>{t('أنشئ حسابك، فعّل بريدك، ثم ابدأ رحلتك التعليمية.', 'Create your account, verify your email, then begin your learning journey.')}</p><div className="aside-rule" /><span>WHITE / BLACK / FOCUS</span></section>
    <section className="auth-card-wrap"><div className="auth-card">
      {mode === 'login' && <>
        <div className="auth-title"><span className="eyebrow">{t('مرحبًا بعودتك', 'Welcome back')}</span><h2>{t('تسجيل الدخول', 'Sign in')}</h2><p>{t('ادخل ببريدك الإلكتروني أو اسم المستخدم.', 'Use your email address or username to continue.')}</p></div>
        <form className="stack" onSubmit={submitLogin}>
          <Field label={t('البريد الإلكتروني أو اسم المستخدم', 'Email address or username')}><input value={login.identity} onChange={(event) => setLogin({ ...login, identity: event.target.value })} required autoComplete="username" /></Field>
          <Field label={t('كلمة المرور', 'Password')}><input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required autoComplete="current-password" /></Field>
          <Button type="submit" loading={loading}>{t('دخول إلى المساحة', 'Enter your space')} <ArrowLeft size={17} /></Button>
        </form>
        <div className="auth-links"><button onClick={() => setMode('forgot')}>{t('نسيت كلمة المرور؟', 'Forgot password?')}</button><span>·</span><button onClick={() => setMode('verify')}>{t('إعادة إرسال التفعيل', 'Resend verification')}</button></div>
        <p className="switch-copy">{t('ليس لديك حساب؟', 'New here?')} <button onClick={() => setMode('register')}>{t('أنشئ حسابًا', 'Create an account')}</button></p>
      </>}
      {mode === 'register' && <>
        <div className="auth-title"><span className="eyebrow">{t('حساب جديد', 'New account')}</span><h2>{t('ابدأ الآن', 'Start now')}</h2><p>{t('سيصلك رابط تأكيد إلى بريدك الإلكتروني.', 'A verification link will be sent to your email address.')}</p></div>
        <form className="stack" onSubmit={submitRegister}>
          <div className="two-columns"><Field label="الاسم الأول"><input value={register.firstName} onChange={(event) => setRegister({ ...register, firstName: event.target.value })} required /></Field><Field label="اسم العائلة"><input value={register.lastName} onChange={(event) => setRegister({ ...register, lastName: event.target.value })} required /></Field></div>
          <Field label="اسم المستخدم"><input dir="ltr" value={register.userName} onChange={(event) => setRegister({ ...register, userName: event.target.value })} required minLength="3" /></Field>
          <Field label="البريد الإلكتروني"><input dir="ltr" type="email" value={register.email} onChange={(event) => setRegister({ ...register, email: event.target.value })} required /></Field>
          <Field label="كلمة المرور" hint="8 أحرف على الأقل، وتشمل حرفًا ورقمًا ورمزًا خاصًا."><input dir="ltr" type="password" value={register.password} onChange={(event) => setRegister({ ...register, password: event.target.value })} required minLength="8" /></Field>
          <Field label="تأكيد كلمة المرور"><input dir="ltr" type="password" value={register.confirmPassword} onChange={(event) => setRegister({ ...register, confirmPassword: event.target.value })} required /></Field>
          <Button type="submit" loading={loading}><UserPlus size={17} /> {t('إنشاء الحساب', 'Create account')}</Button>
        </form>
        <p className="switch-copy">{t('لديك حساب بالفعل؟', 'Already have an account?')} <button onClick={() => setMode('login')}>{t('سجّل الدخول', 'Sign in')}</button></p>
      </>}
      {(mode === 'verify' || mode === 'forgot') && <>
        <div className="auth-title"><span className="eyebrow">{t('البريد الإلكتروني', 'Email')}</span><h2>{mode === 'verify' ? t('تأكيد الحساب', 'Verify account') : t('استعادة كلمة المرور', 'Reset password')}</h2><p>{mode === 'verify' ? t('أدخل بريد الحساب لإعادة إرسال رابط التفعيل.', 'Enter your account email to resend the verification link.') : t('سنرسل إليك رابطًا آمنًا لتعيين كلمة مرور جديدة.', 'We will send you a secure link to set a new password.')}</p></div>
        <form className="stack" onSubmit={(event) => { event.preventDefault(); sendEmail(mode) }}>
          {mode === 'verify' && registeredEmail ? (
            <>
              <Field label={t('البريد الإلكتروني', 'Email address')}>
                <p className="form-email-display">{registeredEmail}</p>
                <input type="hidden" value={registeredEmail} />
              </Field>
            </>
          ) : (
            <Field label={t('البريد الإلكتروني', 'Email address')}><input dir="ltr" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          )}
          <Button type="submit" loading={loading}>{mode === 'verify' ? t('إرسال رابط التفعيل', 'Send verification link') : t('إرسال رابط الاستعادة', 'Send reset link')} <ArrowLeft size={17} /></Button>
        </form>
        <p className="switch-copy"><button onClick={() => setMode('login')}>{t('العودة لتسجيل الدخول', 'Back to sign in')}</button></p>
      </>}
    </div></section>
  </main>
}

function ConfirmationPage({ api, type, onNavigate, showNotice }) {
  const [loading, setLoading] = useState(type === 'email')
  const query = useMemo(() => new URLSearchParams(window.location.search), [])
  const userId = query.get('userId') || ''
  const token = query.get('token') || ''
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })

  useEffect(() => {
    if (type !== 'email') return
    if (!userId || !token) { setLoading(false); showNotice('رابط التفعيل لا يحتوي البيانات المطلوبة.', 'error'); return }
    api.confirmEmail(userId, token)
      .then(() => {
        showNotice(t('تم تأكيد البريد الإلكتروني. جاري تحويلك إلى تسجيل الدخول...', 'Email confirmed successfully. Redirecting to sign in...'))
        // Redirect to login after a short delay
        setTimeout(() => {
          onNavigate('/auth')
        }, 1500)
      })
      .catch((error) => showNotice(friendlyError(error), 'error'))
      .finally(() => setLoading(false))
  }, [api, token, type, userId, showNotice, onNavigate])

  const reset = async (event) => {
    event.preventDefault(); setLoading(true)
    try {
      const response = await api.confirmPasswordReset({ userId, token, ...form })
      showNotice(t('تم تغيير كلمة المرور.', 'Your password has been updated.')); onNavigate('/auth')
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }

  if (type === 'email') return <main className="single-page"><section className="result-card"><ShieldCheck size={42} /><span className="eyebrow">تأكيد البريد</span><h1>{loading ? 'جارٍ تأكيد حسابك…' : 'تم تأكيد البريد الإلكتروني بنجاح!'}</h1><p>{loading ? 'يرجى الانتظار بينما نؤكد حسابك...' : 'تم تأكيد بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول إلى WhiteCode Academy.'}</p><div className="confirmation-actions">{!loading && <Button onClick={() => onNavigate('/auth')}>اذهب لتسجيل الدخول <ArrowLeft size={17} /></Button>}</div></section></main>
  return <main className="single-page"><section className="result-card reset-card"><KeyRound size={42} /><span className="eyebrow">كلمة مرور جديدة</span><h1>عيّن كلمة مرورك.</h1>
    <div className="endpoint-pending" role="status"><span>قريبًا</span><p>تأكيد كلمة المرور ينتظر تهيئة اتصال آمن من الـ API.</p></div>
    <form className="stack" onSubmit={reset}>
      <Field label="كلمة المرور الجديدة"><input dir="ltr" type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required minLength="8" disabled /></Field>
      <Field label="تأكيد كلمة المرور"><input dir="ltr" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required disabled /></Field>
      <Button type="button" disabled>حفظ كلمة المرور</Button>
    </form>
    <p className="api-limitation">ملاحظة تقنية: مسار الباك إند الحالي يعرّف هذا الطلب كـ <code>GET</code> مع <code>FromBody</code>، بينما المتصفحات لا ترسل body في GET. لتفعيله بأمان، نحتاج <code>POST /api/password/confirm-reset-password</code> مع <code>userId</code> و <code>token</code> في query وبيانات كلمة المرور في body.</p>
  </section></main>
}

function CourseEditor({ api, item, roles, onClose, onSaved, showNotice }) {
  const [form, setForm] = useState({
    name: item?.name || '', description: item?.description || '',
    departmentId: item?.departmentId || '', instructorId: item?.instructorId || '',
  })
  const [departmentLabel, setDepartmentLabel] = useState(item?.departmentName || '')
  const [instructorLabel, setInstructorLabel] = useState(item?.instructorName || '')
  const [loading, setLoading] = useState(false)
  const isAdmin = roles.includes('Admin')
  const submit = async (event) => {
    event.preventDefault(); setLoading(true)
    try {
      const data = cleanObject(form)
      const response = item ? await api.updateCourse(item.id, data) : await api.createCourse(data)
      showNotice(item ? t('تم تحديث الدورة.', 'Course updated.') : t('تم إنشاء الدورة.', 'Course created.'))
      onSaved(response); onClose()
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }
  return <Modal title={item ? 'تعديل الدورة' : 'دورة جديدة'} onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <Field label="اسم الدورة"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
      <Field label="الوصف"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></Field>
      <SearchPicker label="القسم" value={form.departmentId} selectedLabel={departmentLabel} required fetchItems={(query) => api.getDepartments(query)} getLabel={(department) => department.name} onChange={(department) => { setForm({ ...form, departmentId: department?.id || '' }); setDepartmentLabel(department?.name || '') }} />
      {isAdmin && <SearchPicker label="المدرّس" value={form.instructorId} selectedLabel={instructorLabel} required={!item} fetchItems={(query) => api.getInstructors(query)} getLabel={(instructor) => `${instructor.firstName} ${instructor.lastName} — ${instructor.email}`} onChange={(instructor) => { setForm({ ...form, instructorId: instructor?.id || '' }); setInstructorLabel(instructor ? `${instructor.firstName} ${instructor.lastName}` : '') }} />}
      <div className="form-actions"><Button className="button-secondary" onClick={onClose}>إلغاء</Button><Button type="submit" loading={loading}>{item ? 'حفظ التعديلات' : 'إنشاء الدورة'}</Button></div>
    </form>
  </Modal>
}

function SectionEditor({ api, item, courseId, onClose, onSaved, showNotice }) {
  const [form, setForm] = useState({ name: item?.name || '', description: item?.description || '', videoFile: null, pdfFile: null })
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setLoading(true)
    try {
      const formData = createFormData({
        name: form.name, description: form.description, videoFile: form.videoFile, pdfFile: form.pdfFile,
        ...(!item ? { courseId } : {}),
      })
      const response = item ? await api.updateSection(item.id, formData) : await api.createSection(formData)
      showNotice(item ? t('تم تحديث الدرس.', 'Lesson updated.') : t('تم رفع الدرس.', 'Lesson uploaded.'))
      onSaved(response); onClose()
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }
  return <Modal title={item ? 'تعديل الدرس' : 'رفع درس جديد'} onClose={onClose}>
    <form className="stack" onSubmit={submit}>
      <Field label="عنوان الدرس"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required={!item} /></Field>
      <Field label="وصف الدرس"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required={!item} /></Field>
      <Field label="ملف الفيديو" hint={item ? 'اتركه فارغًا للإبقاء على الفيديو الحالي.' : 'مطلوب عند إنشاء الدرس.'}><input type="file" accept="video/*" onChange={(event) => setForm({ ...form, videoFile: event.target.files[0] || null })} required={!item} /></Field>
      <Field label="ملف PDF" hint="اختياري."><input type="file" accept="application/pdf" onChange={(event) => setForm({ ...form, pdfFile: event.target.files[0] || null })} /></Field>
      <div className="form-actions"><Button className="button-secondary" onClick={onClose}>إلغاء</Button><Button type="submit" loading={loading}><Upload size={17} /> {item ? 'حفظ الدرس' : 'رفع الدرس'}</Button></div>
    </form>
  </Modal>
}

function AcademyPage({ api, roles, showNotice, courseId, onNavigate }) {
  const [courses, setCourses] = useState([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [sections, setSections] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null)
  const isStaff = roles.some((role) => role === 'Admin' || role === 'Instructor')
  const isAdmin = roles.includes('Admin')
  const isStudent = roles.includes('User')

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const courseData = await api.getCourses({ pageNumber: page, pageSize, wordForSearch: query || 'all', sortBy: 'name' })
      setCourses(courseData || [])
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }, [api, page, query, showNotice])

  useEffect(() => { const delay = setTimeout(loadCatalog, query ? 250 : 0); return () => clearTimeout(delay) }, [loadCatalog, query])

  useEffect(() => { setPage(1) }, [query])

  const loadCourseDetails = useCallback(async (id, preview) => {
    setBusy(true); setSelected(preview || null); setSections([]); setEnrollments([])
    try {
      const jobs = [api.getCourse(id), api.getSections(id)]
      if (isStaff) jobs.push(api.getEnrollmentsByCourse(id))
      const [fullCourse, sectionData, enrollmentData] = await Promise.all(jobs)
      setSelected(fullCourse || preview); setSections(sectionData || []); setEnrollments(enrollmentData || [])
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setBusy(false) }
  }, [api, isStaff, showNotice])

  useEffect(() => {
    if (courseId) loadCourseDetails(courseId)
    else { setSelected(null); setSections([]); setEnrollments([]) }
  }, [courseId, loadCourseDetails])

  const openCourse = (course) => onNavigate(`/dashboard/courses/${course.id}`)

  const remove = async (label, action) => {
    if (!window.confirm(`هل تريد حذف ${label}؟ لا يمكن التراجع عن هذا الإجراء.`)) return
    setBusy(true)
    try { await action(); showNotice('تم الحذف بنجاح.'); onNavigate('/dashboard/courses'); await loadCatalog() } catch (error) { showNotice(friendlyError(error), 'error') } finally { setBusy(false) }
  }
  const enroll = async () => {
    if (!selected) return
    setBusy(true)
    try { await api.enroll(selected.id); showNotice(t('تم تسجيلك في الدورة.', 'You are enrolled in this course.')) } catch (error) { showNotice(friendlyError(error), 'error') } finally { setBusy(false) }
  }

  return <section className="workspace">
    <div className="workspace-header"><div><span className="eyebrow">الدورات</span><h1>{selected ? selected.name : 'مكتبة التعلّم'}</h1></div><div className="workspace-actions">{isStaff && !selected && <Button onClick={() => setModal({ type: 'course' })}><Plus size={17} /> دورة جديدة</Button>}{selected && <Button className="button-secondary" onClick={() => onNavigate('/dashboard/courses')}><ArrowLeft size={17} /> العودة للقائمة</Button>}</div></div>
    {!selected ? <>
      <div className="search-row"><Search size={20} /><input placeholder="ابحث عن دورة…" value={query} onChange={(event) => setQuery(event.target.value)} /><span>{courses.length} نتيجة</span></div>
      {loading ? <div className="loading-block">جارٍ تحميل الدورات…</div> : courses.length ? <><div className="course-grid">{courses.map((course) => <button className="course-card" key={course.id} onClick={() => openCourse(course)}><span className="course-index">COURSE</span><h2>{course.name}</h2><p>{course.description}</p><div><span>{course.totalSections} درس</span><span>{course.totalHours} ساعة</span><ChevronLeft size={19} /></div></button>)}</div><Pagination page={page} itemCount={courses.length} onPageChange={setPage} label="الدورات" /></> : <Empty title="لا توجد دورات مطابقة" detail="جرّب مصطلح بحث آخر أو أضف دورة من لوحة المدرّس." />}
    </> : <CourseDetail course={selected} sections={sections} enrollments={enrollments} busy={busy} api={api} isStaff={isStaff} isStudent={isStudent} roles={roles} onEnroll={enroll} onEditCourse={() => setModal({ type: 'course', item: selected })} onDeleteCourse={() => remove('الدورة', () => api.deleteCourse(selected.id))} onEditSection={(item) => setModal({ type: 'section', item })} onAddSection={() => setModal({ type: 'section' })} onDeleteSection={(item) => remove('الدرس', () => api.deleteSection(item.id))} onReload={() => loadCourseDetails(selected.id, selected)} showNotice={showNotice} />}
    {modal?.type === 'course' && <CourseEditor api={api} item={modal.item} roles={roles} onClose={() => setModal(null)} onSaved={async (course) => { await loadCatalog(); if (course?.id) onNavigate(`/dashboard/courses/${course.id}`) }} showNotice={showNotice} />}
    {modal?.type === 'section' && <SectionEditor api={api} item={modal.item} courseId={selected?.id} onClose={() => setModal(null)} onSaved={() => loadCourseDetails(selected.id, selected)} showNotice={showNotice} />}
  </section>
}

function CourseDetail({ course, sections, enrollments, busy, api, isStaff, isStudent, roles, onEnroll, onEditCourse, onDeleteCourse, onEditSection, onAddSection, onDeleteSection, onReload, showNotice }) {
  const [showEnrollments, setShowEnrollments] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)
  const [videoError, setVideoError] = useState(false)
  const [checkingVideoId, setCheckingVideoId] = useState('')
  const openVideo = async (section) => {
    if (!section.videoUrl) {
      showNotice(t('لا يوجد ملف فيديو مرفوع لهذا الدرس بعد.', 'There is no uploaded video for this lesson yet.'), 'error')
      return
    }
    setCheckingVideoId(section.id)
    const available = await api.mediaExists(section.videoUrl)
    setCheckingVideoId('')
    if (!available) {
      showNotice(t('ملف الفيديو لهذا الدرس غير متاح حاليًا. تواصل مع المدرّس لإعادة رفعه.', 'This lesson video is currently unavailable. Ask the instructor to upload it again.'), 'error')
      return
    }
    setVideoError(false)
    setActiveVideo(section)
  }
  const removeEnrollment = async (enrollment) => {
    if (!window.confirm('إلغاء تسجيل هذا الطالب من الدورة؟')) return
    try { await api.unenroll(enrollment.studentId, enrollment.courseId); showNotice('تم إلغاء التسجيل.'); onReload() } catch (error) { showNotice(friendlyError(error), 'error') }
  }
  return <div className="course-detail">
    <article className="course-overview"><span className="eyebrow">الدورة</span><h2>{course.name}</h2><p>{course.description}</p><div className="metadata"><span>{course.totalSections} درسًا</span><span>{course.totalHours} ساعة</span><span>أُنشئت {formatDate(course.createdAt)}</span></div><div className="detail-actions">{isStudent && <Button loading={busy} onClick={onEnroll}><GraduationCap size={17} /> سجّل في الدورة</Button>}{isStaff && <><Button className="button-secondary" onClick={onEditCourse}><Pencil size={17} /> تعديل الدورة</Button><Button className="button-danger" onClick={onDeleteCourse}><Trash2 size={17} /> حذف</Button></>}{isStaff && <Button className="button-text" onClick={() => setShowEnrollments(!showEnrollments)}><Users size={17} /> المسجلون ({enrollments.length})</Button>}</div></article>
    {showEnrollments && <section className="enrollment-panel"><h3>المسجلون في {course.name}</h3>{enrollments.length ? <div className="table-wrap"><table><thead><tr><th>اسم الدورة</th><th>معرّف الطالب</th><th>تاريخ التسجيل</th>{roles.includes('Admin') && <th />}</tr></thead><tbody>{enrollments.map((item) => <tr key={item.id}><td>{item.courseName}</td><td dir="ltr" className="mono">{item.studentId}</td><td>{formatDate(item.createdAt)}</td>{roles.includes('Admin') && <td><button className="table-action" onClick={() => removeEnrollment(item)}>إلغاء</button></td>}</tr>)}</tbody></table></div> : <Empty title="لا يوجد تسجيلات" detail="لم يسجل أي طالب في هذه الدورة بعد." />}</section>}
    <section className="lessons"><div className="section-heading"><div><span className="eyebrow">المحتوى</span><h2>الدروس</h2></div>{isStaff && <Button onClick={onAddSection}><Plus size={17} /> رفع درس</Button>}</div>{busy ? <div className="loading-block">جارٍ تحميل المحتوى…</div> : sections.length ? <div className="lesson-list">{sections.map((section, index) => <article className="lesson-row" key={section.id}><span className="lesson-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{section.name}</h3><p>{section.description}</p><div className="lesson-meta"><span>{section.dayOfWeek}</span><span>{section.startAt} — {section.endAt}</span>{section.pdfUrl && <a href={api.asset(section.pdfUrl)} target="_blank" rel="noreferrer"><FileText size={16} /> ملف الدرس</a>}</div></div><div className="lesson-actions"><Button className="button-secondary button-compact" loading={checkingVideoId === section.id} onClick={() => openVideo(section)}><MonitorPlay size={16} /> شاهد</Button>{isStaff && <><button className="icon-button framed" title="تعديل" onClick={() => onEditSection(section)}><Pencil size={16} /></button><button className="icon-button framed" title="حذف" onClick={() => onDeleteSection(section)}><Trash2 size={16} /></button></>}</div></article>)}</div> : <Empty title="لا توجد دروس بعد" detail={isStaff ? 'ارفع أول فيديو للدورة من زر «رفع درس».' : 'سيظهر محتوى الدورة هنا فور إضافته.'} />}</section>
    {activeVideo && <Modal title={activeVideo.name} onClose={() => setActiveVideo(null)} wide><video className="course-video" controls autoPlay playsInline preload="metadata" onError={() => setVideoError(true)} src={api.media(activeVideo.videoUrl)}>{t('متصفحك لا يدعم تشغيل الفيديو.', 'Your browser does not support video playback.')}</video>{videoError && <p className="video-error">{t('تعذر تشغيل الفيديو داخل الصفحة. جرّب لاحقًا أو اطلب من المدرّس إعادة رفع الملف.', 'The video could not play in this page. Try again later or ask the instructor to upload the file again.')}</p>}<p className="video-description">{activeVideo.description}</p></Modal>}
  </div>
}

function DepartmentEditor({ api, item, onClose, onSaved, showNotice }) {
  const [form, setForm] = useState({ name: item?.name || '', description: item?.description || '', imageFile: null })
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setLoading(true)
    try {
      const payload = createFormData(form)
      const response = item ? await api.updateDepartment(item.id, payload) : await api.createDepartment(payload)
      showNotice(item ? t('تم تعديل القسم.', 'Department updated.') : t('تم إنشاء القسم.', 'Department created.')); onSaved(); onClose()
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }
  return <Modal title={item ? 'تعديل القسم' : 'قسم جديد'} onClose={onClose}>
    <form className="stack" onSubmit={submit}><Field label="اسم القسم"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field><Field label="الوصف"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></Field><Field label="الصورة" hint="اختيارية — jpg أو jpeg أو png."><input type="file" accept="image/jpeg,image/png" onChange={(event) => setForm({ ...form, imageFile: event.target.files[0] || null })} /></Field><div className="form-actions"><Button className="button-secondary" onClick={onClose}>إلغاء</Button><Button type="submit" loading={loading}>{item ? 'حفظ التعديلات' : 'إنشاء القسم'}</Button></div></form>
  </Modal>
}

function InstructorEditor({ api, item, onClose, onSaved, showNotice }) {
  const [form, setForm] = useState({ departmentId: item?.departmentId || '', userId: '' })
  const [departmentLabel, setDepartmentLabel] = useState(item?.departmentName || '')
  const [userLabel, setUserLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setLoading(true)
    try {
      const response = item
        ? await api.updateInstructor(item.id, { departmentId: form.departmentId || null })
        : await api.assignInstructor({ userId: form.userId, departmentId: form.departmentId || null })
      showNotice(item ? t('تم تحديث المدرّس.', 'Instructor updated.') : t('تم تعيين المدرّس.', 'Instructor assigned.')); onSaved(); onClose()
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }
  return <Modal title={item ? 'تعديل المدرّس' : 'تعيين مدرّس'} onClose={onClose}>
    <form className="stack" onSubmit={submit}>{!item && <SearchPicker label={t('المستخدم', 'User')} hint={t('ابحث بالاسم أو البريد ثم اختر الحساب؛ لا يظهر أو يُكتب أي معرّف.', 'Search by name or email, then choose the account. No identifier is shown or typed.')} value={form.userId} selectedLabel={userLabel} fetchItems={(query) => api.getUsers(query)} getLabel={(user) => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.userName || user.email} onChange={(user) => { const id = user?.id || user?.userId || ''; setForm({ ...form, userId: id }); setUserLabel(user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.userName || user.email) : '') }} required />}<SearchPicker label={t('القسم', 'Department')} value={form.departmentId} selectedLabel={departmentLabel} fetchItems={(query) => api.getDepartments(query)} getLabel={(department) => department.name} onChange={(department) => { setForm({ ...form, departmentId: department?.id || '' }); setDepartmentLabel(department?.name || '') }} /><div className="form-actions"><Button className="button-secondary" onClick={onClose}>{t('إلغاء', 'Cancel')}</Button><Button type="submit" loading={loading} disabled={!item && !form.userId}>{item ? t('حفظ التعديلات', 'Save changes') : t('تعيين المدرّس', 'Assign instructor')}</Button></div></form>
  </Modal>
}

function ManagementPage({ api, showNotice, tab = 'departments', onNavigate }) {
  const [departments, setDepartments] = useState([])
  const [instructors, setInstructors] = useState([])
  const [students, setStudents] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [courseId, setCourseId] = useState('')
  const [courseLabel, setCourseLabel] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (tab === 'enrollments') { setLoading(false); return }
    setLoading(true)
    try {
      if (tab === 'departments') setDepartments(await api.getDepartments({ pageNumber: page, pageSize, wordForSearch: query || '%', sortBy: 'name' }) || [])
      if (tab === 'instructors') setInstructors(await api.getInstructors({ pageNumber: page, pageSize, wordForSearch: query || '%', sortBy: 'name' }) || [])
      if (tab === 'students') setStudents(await api.getStudents({ pageNumber: page, pageSize, wordForSearch: query || '%', sortBy: 'name' }) || [])
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }, [api, page, query, showNotice, tab])
  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1); setQuery('') }, [tab])

  const remove = async (label, action) => {
    if (!window.confirm(`هل تريد حذف ${label}؟`)) return
    try { await action(); showNotice('تم الحذف بنجاح.'); await load() } catch (error) { showNotice(friendlyError(error), 'error') }
  }
  const loadEnrollments = async (id = courseId) => {
    if (!id) { showNotice('اختر دورة أولًا.', 'error'); return }
    setCourseId(id)
    try { setEnrollments(await api.getEnrollmentsByCourse(id) || []) } catch (error) { showNotice(friendlyError(error), 'error') }
  }
  const editDepartment = async (department) => {
    try { setModal({ type: 'department', item: await api.getDepartment(department.id) }) } catch (error) { showNotice(friendlyError(error), 'error') }
  }
  const editInstructor = async (instructor) => {
    try { setModal({ type: 'instructor', item: await api.getInstructor(instructor.id) }) } catch (error) { showNotice(friendlyError(error), 'error') }
  }

  return <section className="workspace management">
    <div className="workspace-header"><div><span className="eyebrow">ADMIN</span><h1>لوحة الإدارة</h1></div><Button className="button-secondary" onClick={load}><RefreshCw size={17} /> تحديث البيانات</Button></div>
    <div className="tabs" role="tablist"><button className={tab === 'departments' ? 'active' : ''} onClick={() => onNavigate('/dashboard/admin/departments')}><BookOpen size={17} /> الأقسام</button><button className={tab === 'instructors' ? 'active' : ''} onClick={() => onNavigate('/dashboard/admin/instructors')}><UserCog size={17} /> المدرسون</button><button className={tab === 'enrollments' ? 'active' : ''} onClick={() => onNavigate('/dashboard/admin/enrollments')}><Users size={17} /> التسجيلات</button><button className={tab === 'students' ? 'active' : ''} onClick={() => onNavigate('/dashboard/admin/students')}><Trash2 size={17} /> الطلاب</button></div>
    {loading ? <div className="loading-block">جارٍ تحميل بيانات الإدارة…</div> : <>
      {tab === 'departments' && <section className="management-panel"><div className="panel-header"><div><h2>الأقسام</h2><p>إدارة التصنيفات وصورها.</p></div><Button onClick={() => setModal({ type: 'department' })}><Plus size={17} /> قسم جديد</Button></div><div className="search-row"><Search size={19} /><input placeholder="ابحث باسم القسم…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>{departments.length ? <><div className="table-wrap"><table><thead><tr><th>القسم</th><th>الوصف</th><th>تاريخ الإنشاء</th><th /></tr></thead><tbody>{departments.map((department) => <tr key={department.id}><td><strong>{department.name}</strong></td><td>{department.description}</td><td>{formatDate(department.createdAt)}</td><td className="row-actions"><button className="table-action" onClick={() => editDepartment(department)}>تعديل</button><button className="table-action table-action-danger" onClick={() => remove('القسم', () => api.deleteDepartment(department.id))}>حذف</button></td></tr>)}</tbody></table></div><Pagination page={page} itemCount={departments.length} onPageChange={setPage} label="الأقسام" /></> : <Empty title="لا توجد أقسام" detail="أنشئ أول قسم للأكاديمية." />}</section>}
      {tab === 'instructors' && <section className="management-panel"><div className="panel-header"><div><h2>المدرسون</h2><p>اختر المستخدم المسجل ثم اربطه بقسم.</p></div><Button onClick={() => setModal({ type: 'instructor' })}><UserPlus size={17} /> تعيين مدرّس</Button></div><div className="search-row"><Search size={19} /><input placeholder="ابحث باسم المدرّس أو البريد…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>{instructors.length ? <><div className="table-wrap"><table><thead><tr><th>المدرّس</th><th>البريد</th><th>القسم</th><th /></tr></thead><tbody>{instructors.map((instructor) => <tr key={instructor.id}><td><strong>{instructor.firstName} {instructor.lastName}</strong></td><td dir="ltr">{instructor.email}</td><td>{instructor.departmentName || '—'}</td><td className="row-actions"><button className="table-action" onClick={() => editInstructor(instructor)}>تعديل</button><button className="table-action table-action-danger" onClick={() => remove('المدرّس', () => api.deleteInstructor(instructor.id))}>إزالة</button></td></tr>)}</tbody></table></div><Pagination page={page} itemCount={instructors.length} onPageChange={setPage} label="المدرسين" /></> : <Empty title="لا يوجد مدرسون" detail="أضف endpoint بحث للمستخدمين المسجلين لتفعيل تعيين المدرس بدون إدخال ID." />}</section>}
      {tab === 'enrollments' && <section className="management-panel"><div className="panel-header"><div><h2>تسجيلات الدورات</h2><p>اختر دورة بالبحث لعرض الطلاب المسجلين وإلغاء التسجيل عند الحاجة.</p></div></div><SearchPicker label="الدورة" value={courseId} selectedLabel={courseLabel} fetchItems={(search) => api.getCourses(search)} getLabel={(course) => course.name} onChange={(course) => { setCourseId(course?.id || ''); setCourseLabel(course?.name || ''); setEnrollments([]); if (course) loadEnrollments(course.id) }} />{courseId && (enrollments.length ? <div className="table-wrap"><table><thead><tr><th>الدورة</th><th>معرّف الطالب</th><th>التاريخ</th><th /></tr></thead><tbody>{enrollments.map((item) => <tr key={item.id}><td>{item.courseName}</td><td className="mono" dir="ltr">{item.studentId}</td><td>{formatDate(item.createdAt)}</td><td><button className="table-action table-action-danger" onClick={async () => { try { await api.unenroll(item.studentId, item.courseId); showNotice('تم إلغاء التسجيل.'); loadEnrollments() } catch (error) { showNotice(friendlyError(error), 'error') } }}>إلغاء التسجيل</button></td></tr>)}</tbody></table></div> : <Empty title="لا توجد تسجيلات" detail="لم يسجل أحد في هذه الدورة حتى الآن." />)}</section>}
      {tab === 'students' && <section className="management-panel"><div className="panel-header"><div><h2>الطلاب</h2><p>ابحث باسم الطالب أو بريده، ثم راجع الحسابات المسجلة من دون التعامل مع معرّفات يدوية.</p></div></div><div className="search-row"><Search size={19} /><input placeholder="ابحث باسم الطالب أو البريد…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>{students.length ? <><div className="table-wrap"><table><thead><tr><th>الطالب</th><th>البريد</th><th>اسم المستخدم</th><th>العمليات</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><strong>{student.firstName} {student.lastName}</strong></td><td dir="ltr">{student.email || '—'}</td><td dir="ltr">{student.userName || '—'}</td><td><button className="table-action table-action-danger" onClick={() => remove('الطالب', () => api.deleteStudent(student.id))}>حذف</button></td></tr>)}</tbody></table></div><Pagination page={page} itemCount={students.length} onPageChange={setPage} label="الطلاب" /></> : <Empty title="لا يوجد طلاب مطابقون" detail="جرّب كتابة اسم مختلف أو ارجع إلى الصفحة الأولى." />}</section>}
    </>}
    {modal?.type === 'department' && <DepartmentEditor api={api} item={modal.item} onClose={() => setModal(null)} onSaved={load} showNotice={showNotice} />}
    {modal?.type === 'instructor' && <InstructorEditor api={api} item={modal.item} onClose={() => setModal(null)} onSaved={load} showNotice={showNotice} />}
  </section>
}

function ProfilePage({ api, roles, onLogout, showNotice }) {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', userName: '', imageUrl: null })
  const [myEnrollments, setMyEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const isUser = roles.includes('User')
  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getProfile(); setProfile(data); setForm({ firstName: data.firstName || '', lastName: data.lastName || '', userName: data.userName || '', imageUrl: null })
      if (isUser) {
        try {
          const student = await api.getCurrentStudent()
          if (student?.id) {
            api.setStudentId(student.id)
            setMyEnrollments(await api.getEnrollmentsByStudent(student.id) || [])
          }
        } catch (error) {
          // A student profile is created automatically after the first verified login.
          // Leave the account usable if an older account does not have one yet.
          if (error?.status !== 404) throw error
        }
      }
    } catch (error) { showNotice(friendlyError(error), 'error') } finally { setLoading(false) }
  }, [api, isUser, showNotice])
  useEffect(() => { loadProfile() }, [loadProfile])
  const update = async (event) => {
    event.preventDefault(); setSaving(true)
    try { const data = await api.updateProfile(createFormData(form)); setProfile(data); showNotice(t('تم تحديث ملفك الشخصي.', 'Your profile has been updated.')) } catch (error) { showNotice(friendlyError(error), 'error') } finally { setSaving(false) }
  }
  const createStudent = async () => {
    setSaving(true)
    try { const data = await api.assignStudent(); api.setStudentId(data?.id); setMyEnrollments([]); showNotice(t('تم إنشاء ملف الطالب.', 'Student profile created.')); await loadProfile() } catch (error) { showNotice(friendlyError(error), 'error') } finally { setSaving(false) }
  }
  return <section className="workspace"><div className="workspace-header"><div><span className="eyebrow">{t('الملف الشخصي', 'Profile')}</span><h1>{t('حسابي', 'My account')}</h1></div><Button className="button-danger" onClick={onLogout}><LogOut size={17} /> {t('تسجيل الخروج', 'Sign out')}</Button></div>{loading ? <div className="loading-block">{t('جارٍ تحميل ملفك…', 'Loading your profile…')}</div> : <div className="profile-grid"><section className="profile-card"><div className="profile-avatar">{profile?.firstName?.[0] || 'U'}</div><h2>{profile?.firstName} {profile?.lastName}</h2><p dir="ltr">{profile?.email}</p><div className="role-list">{roles.map((role) => <span key={role}>{role}</span>)}</div><Button className="button-secondary" onClick={async () => { try { await api.logoutAll(); showNotice(t('تم تسجيل الخروج من جميع الأجهزة.', 'You have been signed out everywhere.')); onLogout() } catch (error) { showNotice(friendlyError(error), 'error') } }}>{t('تسجيل الخروج من كل الأجهزة', 'Sign out of all devices')}</Button></section><section className="profile-form"><h2>{t('بيانات الحساب', 'Account details')}</h2><form className="stack" onSubmit={update}><div className="two-columns"><Field label={t('الاسم الأول', 'First name')}><input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></Field><Field label={t('اسم العائلة', 'Last name')}><input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></Field></div><Field label={t('اسم المستخدم', 'Username')}><input dir="ltr" value={form.userName} onChange={(event) => setForm({ ...form, userName: event.target.value })} /></Field><Field label={t('الصورة الشخصية', 'Profile image')}><input type="file" accept="image/jpeg,image/png" onChange={(event) => setForm({ ...form, imageUrl: event.target.files[0] || null })} /></Field><Button type="submit" loading={saving}><Check size={17} /> {t('حفظ البيانات', 'Save changes')}</Button></form></section>{isUser && <section className="enrollment-panel profile-enrollments"><div className="panel-header"><div><h2>{t('تسجيلاتي', 'My enrolments')}</h2><p>{t('نربط تسجيلاتك الآن بملف الطالب الخاص بالحساب الحالي تلقائيًا.', 'Your enrolments are linked to the current account student profile automatically.')}</p></div>{!api.studentId && <Button onClick={createStudent} loading={saving}><GraduationCap size={17} /> {t('تفعيل ملف الطالب', 'Activate student profile')}</Button>}</div>{myEnrollments.length ? <div className="enrollment-cards">{myEnrollments.map((item) => <article key={item.id}><strong>{item.courseName}</strong><span>{formatDate(item.createdAt)}</span></article>)}</div> : <p className="muted-copy">{api.studentId ? t('لا توجد دورات مسجلة بعد.', 'No courses are enrolled yet.') : t('سيُنشأ ملف الطالب تلقائيًا عند أول تسجيل دخول بعد تأكيد البريد.', 'A student profile is created automatically on the first sign-in after email verification.')}</p>}</section>}</div>}</section>
}

function Dashboard({ api, roles, pathname, onNavigate, onLogout, showNotice }) {
  const parts = pathname.split('/').filter(Boolean)
  const section = parts[1] || 'courses'
  const isAdminPage = section === 'admin'
  const adminTab = parts[2] || 'departments'
  return <main className="dashboard-shell"><aside className="dashboard-nav"><span className="nav-caption">{t('مساحتي', 'MY SPACE')}</span><button className={section === 'courses' ? 'active' : ''} onClick={() => onNavigate('/dashboard/courses')}><BookOpen size={18} /> {t('الأكاديمية', 'Academy')}</button><button className={section === 'profile' ? 'active' : ''} onClick={() => onNavigate('/dashboard/profile')}><UserCog size={18} /> {t('ملفي الشخصي', 'My profile')}</button>{roles.includes('Admin') && <><span className="nav-caption nav-caption-spaced">{t('الإدارة', 'MANAGEMENT')}</span><button className={isAdminPage ? 'active' : ''} onClick={() => onNavigate('/dashboard/admin/departments')}><ShieldCheck size={18} /> {t('إدارة الأكاديمية', 'Academy management')}</button></>}<div className="nav-footer"><span>{t('الدور الحالي', 'Current role')}</span>{roles.map((role) => <strong key={role}>{role}</strong>)}</div></aside><div className="dashboard-content">{section === 'courses' && <AcademyPage api={api} roles={roles} courseId={parts[2]} onNavigate={onNavigate} showNotice={showNotice} />}{section === 'profile' && <ProfilePage api={api} roles={roles} onLogout={onLogout} showNotice={showNotice} />}{isAdminPage && roles.includes('Admin') && <ManagementPage api={api} tab={adminTab} onNavigate={onNavigate} showNotice={showNotice} />}</div></main>
}

function App() {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('whitecode-access-token'))
  const [location, setLocation] = useState(() => `${window.location.pathname}${window.location.search}`)
  const [notice, setNotice] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [preferences, setPreferences] = useState(readPreferences)
  const [isLoading, setIsLoading] = useState(true)
  activeLocale = preferences.locale
  const api = useMemo(() => new WhiteCodeApi({ onSessionChange: setSessionToken }), [])
  const authenticated = Boolean(sessionToken)
  const roles = useMemo(() => getRoles(sessionToken || ''), [sessionToken])
  const showNotice = useCallback((message, type = 'success') => setNotice({ message, type }), [])
  const navigate = useCallback((target) => {
    window.history.pushState({}, '', target)
    setLocation(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  useEffect(() => {
    const onPopState = () => setLocation(`${window.location.pathname}${window.location.search}`)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(null), 7000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    // Simulate app loading - hide loading screen after 1.5 seconds
    const loadingTimer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(loadingTimer)
  }, [])
  useEffect(() => {
    localStorage.setItem(FRONTEND_PREFERENCES_KEY, JSON.stringify(preferences))
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.dataset.density = preferences.density
    document.documentElement.dataset.motion = preferences.motion ? 'on' : 'off'
    document.documentElement.lang = preferences.locale === 'en' ? 'en' : 'ar'
    document.documentElement.dir = preferences.locale === 'en' ? 'ltr' : 'rtl'
    api.setLocale(preferences.locale)
  }, [api, preferences])

  const logout = async () => {
    try { await api.logout(); showNotice('تم تسجيل الخروج.') } catch (error) { showNotice(friendlyError(error), 'error') } finally { api.setToken(null); navigate('/') }
  }
  const path = location.split('?')[0]
  let page
  if (path === '/auth') page = <AuthPage api={api} onAuthenticated={() => setSessionToken(api.token)} onNavigate={navigate} showNotice={showNotice} />
  else if (path === '/confirm-email') page = <ConfirmationPage api={api} type="email" onNavigate={navigate} showNotice={showNotice} />
  else if (path === '/reset-password') page = <ConfirmationPage api={api} type="password" onNavigate={navigate} showNotice={showNotice} />
  else if (path === '/docs') page = <DocsPage authenticated={authenticated} onNavigate={navigate} />
  else if (path === '/courses' || path.startsWith('/courses/')) page = <PublicCoursesPage api={api} courseId={path.split('/')[2]} onNavigate={navigate} showNotice={showNotice} />
  else if (path.startsWith('/dashboard')) page = authenticated ? <Dashboard api={api} roles={roles} pathname={path} onNavigate={navigate} onLogout={logout} showNotice={showNotice} /> : <HomePage api={api} authenticated={authenticated} onNavigate={navigate} showNotice={showNotice} />
  else page = <HomePage api={api} authenticated={authenticated} onNavigate={navigate} showNotice={showNotice} />
  return <>{isLoading ? (
      <div className="site-loader">
        <div className="loader-content">
          <div className="loader-logo">
            <span className="brand-mark">W</span>
            <span>WhiteCode<span className="brand-light">Academy</span></span>
          </div>
          <div className="loader-text">{t('جاري التحميل...', 'Loading...')}</div>
          <div className="loader-progress">
            <div className="loader-bar"></div>
          </div>
        </div>
      </div>
    ) : (
      <>
        <AmbientScene />
        <Header authenticated={authenticated} roles={roles} onNavigate={navigate} onLogout={logout} onOpenSettings={() => setSettingsOpen(true)} />
        {page}
        <Notice notice={notice} onClose={() => setNotice(null)} />
        {settingsOpen && <ApiSettings api={api} preferences={preferences} onPreferencesChange={setPreferences} onSaved={() => showNotice(t('تم حفظ رابط الـ API.', 'The API address has been saved.'))} onClose={() => setSettingsOpen(false)} />}
        <div className="copyright-notice">{t('© 2026 WhiteCodeAcademy. جميع الحقوق محفوظة - هذا الكود source غير مسموح باستخدامه.', '© 2026 WhiteCodeAcademy. All rights reserved - This source code is not permitted for use.')}</div>
      </>
    )}</>
}

export default App
