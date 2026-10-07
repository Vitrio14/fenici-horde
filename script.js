// ===== FENICI-HORDE Gestionale - Script =====
// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA9Rhp0NHzR5QbrbmzwYh9yOq1nkQwNqLc",
  authDomain: "yellow-horde.firebaseapp.com",
  projectId: "yellow-horde",
  storageBucket: "yellow-horde.firebasestorage.app",
  messagingSenderId: "180811964772",
  appId: "1:180811964772:web:166c0fb04a26449c259a71",
  measurementId: "G-0TBYXB61LD"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Stato Globale
let currentUser = null;
let userRole = null; // 'gestore' | 'dipendente'
let currentEmployeeId = null; // id documento employee se staff
let currentEmployeeData = null;
let staffSession = null; // { id, name, login, roles, customPercentage }
let localCatalogYJ = {};
let localCatalogFen = {};
let localEmployees = {};
let localSalesYJ = {};
let localSalesFen = {};
let localSalariesStatus = {};
let localInventoryYJ = {};
let localInventoryYJLogs = [];
let localInventoryFen = {};
let localInventoryFenLogs = [];
let localStashes = {};
let localArchive = {};
let localItemImages = {};

// DOM
const loginPage = document.getElementById('login-page');
const mainDashboard = document.getElementById('main-dashboard');
const roleBadge = document.getElementById('role-badge');

const navSalesYjBtn = document.getElementById('nav-sales-yj-btn');
const navSalesFenBtn = document.getElementById('nav-sales-fen-btn');
const navInventoryYjBtn = document.getElementById('nav-inventory-yj-btn');
const navInventoryFenBtn = document.getElementById('nav-inventory-fen-btn');
const navAdminBtn = document.getElementById('nav-admin-btn');

const salesYjSection = document.getElementById('sales-yj-section');
const salesFenSection = document.getElementById('sales-fen-section');
const inventoryYjSection = document.getElementById('inventory-yj-section');
const inventoryFenSection = document.getElementById('inventory-fen-section');
const adminSection = document.getElementById('admin-section');

const logoutBtn = document.getElementById('logout-btn');
const adminEmployeeFilter = document.getElementById('admin-employee-filter');

// Gestione immagini logo
const imgLogin = document.getElementById('login-main-logo');
const imgNav = document.getElementById('nav-main-logo');
if (imgLogin) imgLogin.onerror = function() { this.style.display = 'none'; };
if (imgNav) imgNav.onerror = function() { this.style.display = 'none'; };


// --- UTILS ---
function formatValuta(valore) {
    if (isNaN(valore) || valore === null) valore = 0;
    return "€ " + valore.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStartOfCurrentWeek() {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
}

function getStashName(stashId) {
    if (localStashes[stashId]) return localStashes[stashId].name;
    return stashId || '—';
}

// --- TOAST ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    let bgClass = 'bg-emerald-600 border-emerald-500';
    let iconClass = 'fa-circle-check';
    if (type === 'error') { bgClass = 'bg-red-600 border-red-500'; iconClass = 'fa-circle-exclamation'; }
    else if (type === 'info') { bgClass = 'bg-indigo-600 border-indigo-500'; iconClass = 'fa-circle-info'; }
    else if (type === 'warning') { bgClass = 'bg-amber-500 border-amber-400 text-gray-900'; iconClass = 'fa-triangle-exclamation'; }

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-white ${bgClass} transform transition-all duration-300 translate-x-4 opacity-0 text-sm font-medium w-full`;
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} text-base shrink-0"></i>
        <div class="flex-1 leading-snug">${message}</div>
        <button type="button" class="ml-1 hover:opacity-70 transition text-current shrink-0 p-1" onclick="this.closest('div').remove()" aria-label="Chiudi"><i class="fa-solid fa-xmark"></i></button>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-4', 'opacity-0');
        toast.classList.add('translate-x-0', 'opacity-100');
    });
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-4');
        toast.classList.remove('opacity-100', 'translate-x-0');
        setTimeout(() => toast.remove(), 280);
    }, 4200);
}

// --- CONFIRM MODAL ---
let modalCallback = null;
function showConfirmModal(title, message, onConfirm, isDangerous = true) {
    const modal = document.getElementById('custom-modal');
    const box = document.getElementById('modal-box');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const icon = document.getElementById('modal-icon');
    if (isDangerous) {
        confirmBtn.className = "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition";
        icon.className = "fa-solid fa-triangle-exclamation text-2xl text-red-400";
    } else {
        confirmBtn.className = "px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-xl font-bold text-sm transition";
        icon.className = "fa-solid fa-circle-question text-2xl text-amber-400";
    }
    modalCallback = onConfirm;
    modal.classList.remove('hidden');
    setTimeout(() => {
        box.classList.remove('scale-95', 'opacity-0');
        box.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function closeConfirmModal() {
    const modal = document.getElementById('custom-modal');
    const box = document.getElementById('modal-box');
    box.classList.remove('scale-100', 'opacity-100');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modalCallback = null;
    }, 200);
}

document.getElementById('modal-cancel-btn').addEventListener('click', closeConfirmModal);
document.getElementById('modal-confirm-btn').addEventListener('click', () => {
    if (modalCallback) modalCallback();
    closeConfirmModal();
});

// --- SMART MODAL ---
window.openSmartModal = function(type, itemId) {
    const modal = document.getElementById('smart-action-modal');
    const box = document.getElementById('smart-modal-box');
    const empSelect = document.getElementById('smart-modal-employee');
    empSelect.innerHTML = '<option value="">-- Seleziona Operatore --</option>';
    Object.keys(localEmployees).forEach(key => {
        empSelect.innerHTML += `<option value="${key}">${localEmployees[key].name}</option>`;
    });

    document.getElementById('smart-modal-form').reset();
    if (userRole === 'dipendente' && currentEmployeeId) {
        empSelect.value = currentEmployeeId;
        empSelect.disabled = true;
    } else {
        empSelect.disabled = false;
    }
    document.getElementById('smart-modal-type').value = type;
    document.getElementById('smart-modal-item-id').value = itemId || '';
    document.getElementById('smart-modal-action-container').classList.add('hidden');
    document.getElementById('smart-modal-custom-name-container').classList.add('hidden');
    document.getElementById('smart-modal-price-container').classList.add('hidden');
    document.getElementById('smart-modal-reason-container').classList.add('hidden');
    const pctBox = document.getElementById('smart-modal-pct-container');
    if (pctBox) pctBox.classList.add('hidden');
    const freePreview = document.getElementById('smart-modal-free-preview');
    if (freePreview) freePreview.classList.add('hidden');

    const titleEl = document.getElementById('smart-modal-title');
    const submitBtn = document.getElementById('smart-modal-submit');
    const priceInput = document.getElementById('smart-modal-price');
    document.getElementById('smart-modal-quantity').value = "1";
    const freePctInput = document.getElementById('smart-modal-free-pct');
    if (freePctInput) freePctInput.value = '';

    if (type === 'inv_yj' || type === 'inv_fen') {
        const item = type === 'inv_yj' ? localInventoryYJ[itemId] : localInventoryFen[itemId];
        if (!item) return;
        titleEl.innerHTML = `<i class="fa-solid fa-boxes-stacked mr-2"></i> Gestisci: <span class="text-white">${item.name}</span>`;
        document.getElementById('smart-modal-action-container').classList.remove('hidden');
        document.getElementById('smart-modal-reason-container').classList.remove('hidden');
        submitBtn.textContent = "Conferma Movimento";
        submitBtn.className = "w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition transform active:scale-95 shadow-lg mt-4";
    } else if (type === 'sale_catalog_yj' || type === 'sale_catalog_fen') {
        const catalog = type === 'sale_catalog_yj' ? localCatalogYJ : localCatalogFen;
        const item = catalog[itemId];
        if (!item) return;
        titleEl.innerHTML = `<i class="fa-solid fa-cash-register mr-2"></i> Vendi: <span class="text-white">${item.name}</span>`;
        document.getElementById('smart-modal-price-container').classList.remove('hidden');
        document.getElementById('smart-modal-price-label').textContent = "Prezzo Unitario (€)";
        priceInput.value = item.price;
        priceInput.disabled = true;
        submitBtn.textContent = "Registra Vendita";
        submitBtn.className = "w-full py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-extrabold rounded-xl transition transform active:scale-95 shadow-lg mt-4";
    } else if (type === 'sale_custom_yj' || type === 'sale_custom_fen') {
        titleEl.innerHTML = `<i class="fa-solid fa-bolt mr-2"></i> Nuova Vendita Libera`;
        document.getElementById('smart-modal-custom-name-container').classList.remove('hidden');
        document.getElementById('smart-modal-price-container').classList.remove('hidden');
        if (pctBox) pctBox.classList.remove('hidden');
        document.getElementById('smart-modal-price-label').textContent = "Prezzo base senza % (€)";
        priceInput.value = '';
        priceInput.disabled = false;
        // Default % guadagno Yellow: 40 (editabile). Lo stipendio usa SEMPRE la % personale del dipendente.
        if (freePctInput) freePctInput.value = 40;
        submitBtn.textContent = "Registra Vendita";
        submitBtn.className = "w-full py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-extrabold rounded-xl transition transform active:scale-95 shadow-lg mt-4";
        if (typeof updateFreeSalePreview === 'function') updateFreeSalePreview();
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        box.classList.remove('scale-95', 'opacity-0');
        box.classList.add('scale-100', 'opacity-100');
    }, 10);
};

function updateFreeSalePreview() {
    const preview = document.getElementById('smart-modal-free-preview');
    if (!preview) return;
    const baseUnit = parseFloat(document.getElementById('smart-modal-price')?.value);
    const pct = parseFloat(document.getElementById('smart-modal-free-pct')?.value);
    const qty = parseInt(document.getElementById('smart-modal-quantity')?.value) || 1;
    if (isNaN(baseUnit) || baseUnit < 0 || isNaN(pct) || pct < 0) {
        preview.classList.add('hidden');
        return;
    }
    // % inserita = guadagno Yellow; stipendio = % personale dipendente
    const empId = document.getElementById('smart-modal-employee')?.value;
    let empPct = 40;
    if (empId && localEmployees[empId] && localEmployees[empId].customPercentage != null && localEmployees[empId].customPercentage !== '') {
        empPct = parseFloat(localEmployees[empId].customPercentage) || 40;
    } else if (userRole === 'dipendente' && currentEmployeeId && localEmployees[currentEmployeeId]?.customPercentage != null) {
        empPct = parseFloat(localEmployees[currentEmployeeId].customPercentage) || 40;
    }
    const priceWithoutPct = baseUnit * qty;
    const yellowGain = priceWithoutPct * (pct / 100);
    const totalPrice = priceWithoutPct + yellowGain;
    const employeeGain = yellowGain * (empPct / 100);
    const elBase = document.getElementById('preview-base');
    const elYellow = document.getElementById('preview-yellow');
    const elTotal = document.getElementById('preview-total');
    const elEmp = document.getElementById('preview-emp');
    if (elBase) elBase.textContent = formatValuta(priceWithoutPct);
    if (elYellow) elYellow.textContent = formatValuta(yellowGain) + ' (' + pct + '%)';
    if (elTotal) elTotal.textContent = formatValuta(totalPrice);
    if (elEmp) elEmp.textContent = formatValuta(employeeGain) + ' (su ' + empPct + '% pers.)';
    preview.classList.remove('hidden');
}

['smart-modal-price', 'smart-modal-free-pct', 'smart-modal-quantity', 'smart-modal-employee'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
        const box = document.getElementById('smart-modal-pct-container');
        if (box && !box.classList.contains('hidden')) updateFreeSalePreview();
    });
    if (el) el.addEventListener('change', () => {
        const box = document.getElementById('smart-modal-pct-container');
        if (box && !box.classList.contains('hidden')) updateFreeSalePreview();
    });
});

window.closeSmartModal = function() {
    const modal = document.getElementById('smart-action-modal');
    const box = document.getElementById('smart-modal-box');
    box.classList.remove('scale-100', 'opacity-100');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
};

document.getElementById('smart-modal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('smart-modal-type').value;
    const itemId = document.getElementById('smart-modal-item-id').value;
    const empId = document.getElementById('smart-modal-employee').value;
    const qty = parseInt(document.getElementById('smart-modal-quantity').value) || 1;

    if (!empId) {
        showToast("Seleziona il tuo nome prima di procedere!", "warning");
        return;
    }

    if (type === 'inv_yj' || type === 'inv_fen') {
        const action = document.getElementById('smart-modal-action').value;
        const reason = document.getElementById('smart-modal-reason').value.trim();
        const collectionItems = type === 'inv_yj' ? 'inventory_items' : 'fenici_items';
        const collectionLogs = type === 'inv_yj' ? 'inventory_logs' : 'fenici_logs';
        const localData = type === 'inv_yj' ? localInventoryYJ : localInventoryFen;
        const item = localData[itemId];
        if (!item) return;

        let newQty = item.quantity;
        if (action === 'preleva') {
            if (qty > item.quantity) {
                showToast(`Impossibile prelevare ${qty}, disponibile: ${item.quantity}.`, "error");
                return;
            }
            newQty -= qty;
        } else {
            newQty += qty;
        }

        const empName = localEmployees[empId] ? localEmployees[empId].name : 'Dipendente';
        const batch = db.batch();
        const itemRef = db.collection(collectionItems).doc(itemId);
        const logRef = db.collection(collectionLogs).doc();
        batch.update(itemRef, { quantity: newQty });
        batch.set(logRef, {
            timestamp: Date.now(),
            dateString: new Date().toLocaleString('it-IT'),
            employeeId: empId,
            employeeName: empName,
            itemId: itemId,
            itemName: item.name,
            action: action,
            quantity: qty,
            reason: reason
        });
        batch.commit().then(() => {
            // Aggiornamento ottimistico locale → UI immediata (il listener sincronizzerà dopo)
            if (localData[itemId]) localData[itemId].quantity = newQty;
            const logEntry = {
                id: 'local_' + Date.now(),
                timestamp: Date.now(),
                dateString: new Date().toLocaleString('it-IT'),
                employeeId: empId,
                employeeName: empName,
                itemId: itemId,
                itemName: item.name,
                action: action,
                quantity: qty,
                reason: reason
            };
            if (type === 'inv_yj') {
                localInventoryYJLogs.unshift(logEntry);
                if (localInventoryYJLogs.length > 50) localInventoryYJLogs.pop();
                forceRefreshAfterWrite('inv_yj');
            } else {
                localInventoryFenLogs.unshift(logEntry);
                if (localInventoryFenLogs.length > 50) localInventoryFenLogs.pop();
                forceRefreshAfterWrite('inv_fen');
            }
            closeSmartModal();
            showToast(`Movimento completato!`, "success");
        }).catch(err => showToast("Errore: " + err.message, "error"));

    } else if (type.startsWith('sale_')) {
        const isYJ = type.includes('_yj');
        const salesCollection = isYJ ? 'current_sales' : 'current_sales_fen';
        const catalog = isYJ ? localCatalogYJ : localCatalogFen;

        let saleData = {
            timestamp: Date.now(),
            dateString: new Date().toLocaleString('it-IT'),
            employeeKey: empId,
            employeeName: localEmployees[empId].name,
            quantity: qty,
            activity: isYJ ? 'yellow_jack' : 'fenici'
        };

        const empPct = localEmployees[empId].customPercentage ? parseFloat(localEmployees[empId].customPercentage) : 40;
        saleData.appliedPercentage = empPct;

        if (type.includes('custom')) {
            const name = document.getElementById('smart-modal-custom-name').value.trim();
            const baseUnit = parseFloat(document.getElementById('smart-modal-price').value);
            const freePct = parseFloat(document.getElementById('smart-modal-free-pct')?.value);
            if (!name || isNaN(baseUnit) || baseUnit < 0) {
                showToast("Compila nome e prezzo base.", "warning");
                return;
            }
            if (isNaN(freePct) || freePct < 0) {
                showToast("Inserisci la % guadagno Yellow (≥ 0).", "warning");
                return;
            }
            // % inserita = guadagno Yellow (aggiunta sul prezzo base)
            // Guadagno dipendente = yellowGain * (% personale del dipendente)
            const priceWithoutPct = baseUnit * qty;
            const yellowGain = priceWithoutPct * (freePct / 100);
            const finalTotalPrice = priceWithoutPct + yellowGain;
            const employeeGain = yellowGain * (empPct / 100);
            saleData.serviceName = "[LIBERO] " + name;
            saleData.totalPrice = finalTotalPrice;
            saleData.priceWithoutPct = priceWithoutPct;
            saleData.freePercentage = freePct;
            saleData.isFreeSale = true;
            saleData.yellowCost = 0;
            saleData.yellowGain = yellowGain;
            saleData.employeeGain = employeeGain;
            saleData.appliedPercentage = empPct; // % personale dipendente
        } else {
            const item = catalog[itemId];
            const finalTotalPrice = item.price * qty;
            const finalYellowCost = (item.cost || 0) * qty;
            const yellowGain = finalTotalPrice - finalYellowCost;
            const employeeGain = (yellowGain * empPct) / 100;
            saleData.serviceName = item.name;
            saleData.totalPrice = finalTotalPrice;
            saleData.yellowCost = finalYellowCost;
            saleData.yellowGain = yellowGain;
            saleData.employeeGain = employeeGain;
        }

        db.collection(salesCollection).add(saleData)
            .then((docRef) => {
                // Ottimistico: inserisci in locale e ridisegna subito
                const localKey = docRef && docRef.id ? docRef.id : ('local_' + Date.now());
                if (isYJ) {
                    localSalesYJ[localKey] = saleData;
                    forceRefreshAfterWrite('sale_yj');
                } else {
                    localSalesFen[localKey] = saleData;
                    forceRefreshAfterWrite('sale_fen');
                }
                if (userRole === 'gestore') forceRefreshAfterWrite('admin');
                closeSmartModal();
                showToast("Vendita registrata!", "success");
            })
            .catch(err => showToast("Errore: " + err.message, "error"));
    }
});

// --- MANUTENZIONE ---
(function() {
    const manutenzioneDiv = document.getElementById('schermata-manutenzione');
    function controllaStatoManutenzione() {
        fetch('status.txt?t=' + new Date().getTime())
            .then(response => {
                if (!response.ok) throw new Error('File status non trovato');
                return response.text();
            })
            .then(stato => {
                const statoPulito = stato.trim().toLowerCase();
                manutenzioneDiv.style.display = (statoPulito === 'on') ? 'flex' : 'none';
            })
            .catch(err => console.log('Errore controllo manutenzione:', err));
    }
    controllaStatoManutenzione();
    setInterval(controllaStatoManutenzione, 5000);
})();


const loginStaffForm = document.getElementById('login-staff-form');
const loginGestoreForm = document.getElementById('login-gestore-form');
const loginStaffPanel = document.getElementById('login-staff-panel');
const loginGestorePanel = document.getElementById('login-gestore-panel');

// Toggle pannelli login
document.getElementById('show-gestore-login')?.addEventListener('click', () => {
    loginStaffPanel.classList.add('hidden');
    loginGestorePanel.classList.remove('hidden');
});
document.getElementById('show-staff-login')?.addEventListener('click', () => {
    loginGestorePanel.classList.add('hidden');
    loginStaffPanel.classList.remove('hidden');
});

// --- LOGIN STAFF (nickname / login + password, SENZA auth anonima) ---
function applyStaffSession(session, employeeData) {
    staffSession = session;
    currentEmployeeId = session.id;
    currentEmployeeData = employeeData || null;
    userRole = 'dipendente';
    sessionStorage.setItem('fenici_staff_session', JSON.stringify(session));
    setupUIForRole();
    initDatabaseListeners();
    loginPage.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
}

function tryRestoreStaffSession() {
    if (userRole === 'gestore') return false;
    const saved = sessionStorage.getItem('fenici_staff_session');
    if (!saved) return false;
    try {
        const session = JSON.parse(saved);
        if (!session || !session.id) return false;
        applyStaffSession(session, null);
        return true;
    } catch (_) {
        sessionStorage.removeItem('fenici_staff_session');
        return false;
    }
}

loginStaffForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = document.getElementById('staff-login').value.trim();
    const password = document.getElementById('staff-password').value;

    if (!nick || !password) {
        showToast("Inserisci nickname e password.", "warning");
        return;
    }

    const btn = loginStaffForm.querySelector('button[type="submit"]');
    const prevBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Accesso...';
    }

    try {
        // Nessuna Auth Firebase: lettura diretta employees (regole: allow read pubblici)
        const snap = await db.collection('employees').get();
        const nickLower = nick.toLowerCase();
        let found = null;
        let foundId = null;

        snap.forEach(doc => {
            const d = doc.data();
            const loginMatch = (d.login || '').trim().toLowerCase() === nickLower;
            const nameMatch = (d.name || '').trim().toLowerCase() === nickLower;
            if ((loginMatch || nameMatch) && String(d.password) === String(password)) {
                found = d;
                foundId = doc.id;
            }
        });

        if (!found) {
            showToast("Nickname o password non validi.", "error");
            if (btn) { btn.disabled = false; btn.innerHTML = prevBtnHtml; }
            return;
        }

        applyStaffSession({
            id: foundId,
            name: found.name,
            login: found.login || found.name,
            roles: found.roles || { salesYJ: true, salesFen: false, invYJ: true, invFen: false },
            customPercentage: found.customPercentage || 40
        }, found);

        showToast(`Benvenuto, ${found.name}!`, "success");
        if (btn) { btn.disabled = false; btn.innerHTML = prevBtnHtml; }
    } catch (err) {
        console.error('Login staff error:', err);
        const msg = (err && String(err.code || err.message || '').includes('permission'))
            ? "Permesso negato su employees. Aggiorna le regole Firestore (read pubblico su employees)."
            : ("Errore di accesso: " + (err.message || err));
        showToast(msg, "error");
        if (btn) { btn.disabled = false; btn.innerHTML = prevBtnHtml; }
    }
});

// --- LOGIN GESTORE (Firebase Auth email) ---
loginGestoreForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('gestore-email').value.trim();
    const password = document.getElementById('gestore-password').value;

    if (email !== 'yellow.gestore@horde.it') {
        showToast("Accesso gestore non autorizzato.", "error");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            staffSession = null;
            currentEmployeeId = null;
            sessionStorage.removeItem('fenici_staff_session');
            showToast("Accesso Gestore effettuato!", "success");
        })
        .catch(err => showToast("Errore di accesso: " + err.message, "error"));
});

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        // Solo gestore usa Firebase Auth (email)
        if (user.email === 'yellow.gestore@horde.it') {
            userRole = 'gestore';
            staffSession = null;
            currentEmployeeId = null;
            currentEmployeeData = null;
            sessionStorage.removeItem('fenici_staff_session');
            setupUIForRole();
            initDatabaseListeners();
            loginPage.classList.add('hidden');
            mainDashboard.classList.remove('hidden');
        } else if (user.isAnonymous) {
            // Non usiamo più auth anonima: esci e lascia il login staff senza Auth
            auth.signOut().catch(() => {});
        } else {
            auth.signOut();
            showToast("Accesso non autorizzato.", "error");
        }
    } else {
        currentUser = null;
        // Staff non ha Firebase Auth: ripristina sessione locale se presente
        if (tryRestoreStaffSession()) {
            return;
        }
        // Nessun gestore e nessuno staff → schermata login
        if (userRole !== 'dipendente') {
            userRole = null;
            staffSession = null;
            currentEmployeeId = null;
            currentEmployeeData = null;
            loginPage.classList.remove('hidden');
            mainDashboard.classList.add('hidden');
        }
    }
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('fenici_staff_session');
    staffSession = null;
    currentEmployeeId = null;
    currentEmployeeData = null;
    userRole = null;
    if (auth.currentUser) {
        auth.signOut().then(() => window.location.reload());
    } else {
        window.location.reload();
    }
});

// Ripristino staff al caricamento (prima che Auth risponda)
tryRestoreStaffSession();

function setupUIForRole() {
    const isGestore = userRole === 'gestore';
    const roles = (staffSession && staffSession.roles) || {};

    if (isGestore) {
        roleBadge.textContent = 'GESTORE';
        roleBadge.className = "px-3 py-1 badge-gestore text-xs font-semibold rounded-full";
    } else {
        roleBadge.textContent = (staffSession?.name || 'STAFF').toUpperCase();
        roleBadge.className = "px-3 py-1 bg-purple-500/20 text-xs font-semibold rounded-full text-purple-300 border border-purple-500/30";
    }

    // Visibilità bottoni nav in base ai ruoli
    const show = (btn, visible) => {
        if (!btn) return;
        if (visible) btn.classList.remove('hidden');
        else btn.classList.add('hidden');
    };

    show(navSalesYjBtn, isGestore || roles.salesYJ);
    show(navSalesFenBtn, isGestore || roles.salesFen);
    show(navInventoryYjBtn, isGestore || roles.invYJ);
    show(navInventoryFenBtn, isGestore || roles.invFen);
    show(navAdminBtn, isGestore);

    // Controlli admin inventario
    const adminYj = document.getElementById('admin-inventory-yj-controls');
    const adminFen = document.getElementById('admin-inventory-fen-controls');
    if (adminYj) adminYj.classList.toggle('hidden', !isGestore);
    if (adminFen) adminFen.classList.toggle('hidden', !isGestore);

    // Staff: inventario centrato (niente colonna admin)
    if (inventoryYjSection) inventoryYjSection.classList.toggle('staff-centered', !isGestore);
    if (inventoryFenSection) inventoryFenSection.classList.toggle('staff-centered', !isGestore);

    // Archivio storico solo gestore
    document.getElementById('manager-sales-archive-yj-section')?.classList.toggle('hidden', !isGestore);
    document.getElementById('manager-sales-archive-fen-section')?.classList.toggle('hidden', !isGestore);

    // Filtri dipendente solo gestore
    document.getElementById('sales-yj-employee-filter')?.classList.toggle('hidden', !isGestore);
    document.getElementById('sales-fen-employee-filter')?.classList.toggle('hidden', !isGestore);

    // Prima sezione disponibile
    if (isGestore || roles.salesYJ) showSection('sales-yj');
    else if (roles.salesFen) showSection('sales-fen');
    else if (roles.invYJ) showSection('inventory-yj');
    else if (roles.invFen) showSection('inventory-fen');
    else showSection('sales-yj');
}

// --- NAVIGAZIONE ---
navSalesYjBtn.addEventListener('click', () => showSection('sales-yj'));
navSalesFenBtn.addEventListener('click', () => showSection('sales-fen'));
navInventoryYjBtn.addEventListener('click', () => showSection('inventory-yj'));
navInventoryFenBtn.addEventListener('click', () => showSection('inventory-fen'));
navAdminBtn.addEventListener('click', () => showSection('admin'));

let currentSectionId = 'sales-yj';

function isSectionVisible(section) {
    return currentSectionId === section;
}
function isAdminOpen() {
    return currentSectionId === 'admin' && userRole === 'gestore';
}
/** Debounce UI updates PER CHIAVE distinta (non cancellare update di sezioni diverse).
 *  delay basso e senza requestIdleCallback per aggiornamenti quasi in tempo reale. */
const _uiTimers = {};
function scheduleUI(fn, delay, key) {
    const k = key || 'default';
    // Se delay è false/0 → esegui subito (dopo microtask) senza debounce
    if (delay === 0 || delay === false) {
        if (_uiTimers[k]) { clearTimeout(_uiTimers[k]); delete _uiTimers[k]; }
        Promise.resolve().then(function () {
            try { fn(); } catch (e) { console.error(e); }
        });
        return;
    }
    const wait = (typeof delay === 'number') ? delay : 30;
    if (_uiTimers[k]) clearTimeout(_uiTimers[k]);
    _uiTimers[k] = setTimeout(function () {
        delete _uiTimers[k];
        try { fn(); } catch (e) { console.error(e); }
    }, wait);
}

/** Forza refresh immediato della sezione inventario / vendite dopo una scrittura locale. */
function forceRefreshAfterWrite(kind) {
    try {
        if (kind === 'inv_yj' || kind === 'all') {
            if (typeof renderInventoryYjGrid === 'function') renderInventoryYjGrid();
            if (typeof renderInventoryYjLogs === 'function') renderInventoryYjLogs();
            if (typeof renderInventoryYjDropdowns === 'function') renderInventoryYjDropdowns();
        }
        if (kind === 'inv_fen' || kind === 'all') {
            if (typeof renderInventoryFenGrid === 'function') renderInventoryFenGrid();
            if (typeof renderInventoryFenLogs === 'function') renderInventoryFenLogs();
            if (typeof renderInventoryFenDropdowns === 'function') renderInventoryFenDropdowns();
        }
        if (kind === 'sale_yj' || kind === 'all') {
            if (typeof renderSalesYjTable === 'function') renderSalesYjTable();
            if (typeof renderQuickSalesYjGrid === 'function') renderQuickSalesYjGrid();
        }
        if (kind === 'sale_fen' || kind === 'all') {
            if (typeof renderSalesFenTable === 'function') renderSalesFenTable();
            if (typeof renderQuickSalesFenGrid === 'function') renderQuickSalesFenGrid();
        }
        if (kind === 'admin' || kind === 'all') {
            if (userRole === 'gestore' && typeof calculateManagementData === 'function') calculateManagementData();
        }
    } catch (e) { console.error('forceRefreshAfterWrite', e); }
}

/** URL immagine item: preferisce libreria (imageId), fallback su dataUrl salvato. */
function resolveItemImageUrl(item) {
    if (!item) return 'https://via.placeholder.com/150?text=No+Immagine';
    if (item.imageId && localItemImages[item.imageId] && localItemImages[item.imageId].dataUrl) {
        return localItemImages[item.imageId].dataUrl;
    }
    if (item.imageUrl) return item.imageUrl;
    return 'https://via.placeholder.com/150?text=No+Immagine';
}

function refreshActiveSectionUI() {
    switch (currentSectionId) {
        case 'sales-yj':
            if (typeof renderQuickSalesYjGrid === 'function') renderQuickSalesYjGrid();
            if (typeof renderSalesYjTable === 'function') renderSalesYjTable();
            if (typeof renderSalesYjDropdowns === 'function') renderSalesYjDropdowns();
            if (typeof renderSalesArchiveWindowYJ === 'function') renderSalesArchiveWindowYJ(localArchive);
            break;
        case 'sales-fen':
            if (typeof renderQuickSalesFenGrid === 'function') renderQuickSalesFenGrid();
            if (typeof renderSalesFenTable === 'function') renderSalesFenTable();
            if (typeof renderSalesFenDropdowns === 'function') renderSalesFenDropdowns();
            if (typeof renderSalesArchiveWindowFen === 'function') renderSalesArchiveWindowFen(localArchive);
            break;
        case 'inventory-yj':
            if (typeof renderStashDropdowns === 'function') renderStashDropdowns();
            if (typeof renderInventoryYjGrid === 'function') renderInventoryYjGrid();
            if (typeof renderInventoryYjDropdowns === 'function') renderInventoryYjDropdowns();
            if (typeof renderInventoryYjLogs === 'function') renderInventoryYjLogs();
            break;
        case 'inventory-fen':
            if (typeof renderStashDropdowns === 'function') renderStashDropdowns();
            if (typeof renderInventoryFenGrid === 'function') renderInventoryFenGrid();
            if (typeof renderInventoryFenDropdowns === 'function') renderInventoryFenDropdowns();
            if (typeof renderInventoryFenLogs === 'function') renderInventoryFenLogs();
            break;
        case 'admin':
            if (typeof renderCatalogYJ === 'function') renderCatalogYJ();
            if (typeof renderCatalogFen === 'function') renderCatalogFen();
            if (typeof renderEmployees === 'function') renderEmployees();
            if (typeof renderCustomStashesList === 'function') renderCustomStashesList();
            if (typeof calculateManagementData === 'function') calculateManagementData();
            if (typeof renderArchive === 'function') renderArchive(localArchive);
            if (typeof renderItemImagesLibrary === 'function') renderItemImagesLibrary();
            if (typeof renderItemImageSelects === 'function') renderItemImageSelects();
            break;
        default:
            break;
    }
}

function showSection(section) {
    currentSectionId = section;
    [salesYjSection, salesFenSection, inventoryYjSection, inventoryFenSection, adminSection].forEach(s => s && s.classList.add('hidden'));
    
    const inactiveClass = "px-3 py-2 rounded-xl bg-gray-700 text-gray-200 font-medium transition hover:bg-gray-600 text-sm";
    const activeClass = "px-3 py-2 rounded-xl nav-active font-medium transition text-sm";
    
    [navSalesYjBtn, navSalesFenBtn, navInventoryYjBtn, navInventoryFenBtn, navAdminBtn].forEach(b => {
        if (!b) return;
        const wasHidden = b.classList.contains('hidden');
        b.className = inactiveClass + (wasHidden ? ' hidden' : '');
    });

    if (section === 'sales-yj') {
        salesYjSection.classList.remove('hidden');
        navSalesYjBtn.className = activeClass;
    } else if (section === 'sales-fen') {
        salesFenSection.classList.remove('hidden');
        navSalesFenBtn.className = activeClass;
    } else if (section === 'inventory-yj') {
        inventoryYjSection.classList.remove('hidden');
        navInventoryYjBtn.className = activeClass;
    } else if (section === 'inventory-fen') {
        inventoryFenSection.classList.remove('hidden');
        navInventoryFenBtn.className = activeClass;
    } else if (section === 'admin') {
        adminSection.classList.remove('hidden');
        navAdminBtn.className = activeClass;
    }

    // Disegna solo la sezione aperta (dati già in memoria)
    scheduleUI(function () { refreshActiveSectionUI(); });
}

// --- LISTENERS FIRESTORE (avvio a fasi + render solo sezione attiva) ---
let listenersStarted = false;

function initDatabaseListeners() {
    if (listenersStarted) return;
    listenersStarted = true;

    // FASE 1: essenziali subito
    db.collection('employees').onSnapshot(snapshot => {
        localEmployees = {};
        snapshot.forEach(doc => { localEmployees[doc.id] = doc.data(); });
        scheduleUI(function () {
            if (typeof renderAllEmployeeDropdowns === 'function') renderAllEmployeeDropdowns();
            if (typeof renderAdminFilterDropdown === 'function') renderAdminFilterDropdown();
            if (isAdminOpen() && typeof renderEmployees === 'function') renderEmployees();
        }, 30, 'employees');
    });

    db.collection('catalog').onSnapshot(snapshot => {
        localCatalogYJ = {};
        snapshot.forEach(doc => { localCatalogYJ[doc.id] = doc.data(); });
        scheduleUI(function () {
            if (isSectionVisible('sales-yj')) {
                if (typeof renderSalesYjDropdowns === 'function') renderSalesYjDropdowns();
                if (typeof renderQuickSalesYjGrid === 'function') renderQuickSalesYjGrid();
            }
            if (isAdminOpen() && typeof renderCatalogYJ === 'function') renderCatalogYJ();
        }, 30, 'catalog_yj');
    });

    db.collection('catalog_fen').onSnapshot(snapshot => {
        localCatalogFen = {};
        snapshot.forEach(doc => { localCatalogFen[doc.id] = doc.data(); });
        scheduleUI(function () {
            if (isSectionVisible('sales-fen')) {
                if (typeof renderSalesFenDropdowns === 'function') renderSalesFenDropdowns();
                if (typeof renderQuickSalesFenGrid === 'function') renderQuickSalesFenGrid();
            }
            if (isAdminOpen() && typeof renderCatalogFen === 'function') renderCatalogFen();
        }, 30, 'catalog_fen');
    });

    // FASE 2: vendite / depositi
    setTimeout(function () {
        db.collection('custom_stashes').onSnapshot(snapshot => {
            localStashes = {};
            snapshot.forEach(doc => { localStashes[doc.id] = doc.data(); });
            scheduleUI(function () {
                if (typeof renderStashDropdowns === 'function') renderStashDropdowns();
                if (isAdminOpen() && typeof renderCustomStashesList === 'function') renderCustomStashesList();
                if (isSectionVisible('inventory-yj') && typeof renderInventoryYjGrid === 'function') renderInventoryYjGrid();
                if (isSectionVisible('inventory-fen') && typeof renderInventoryFenGrid === 'function') renderInventoryFenGrid();
            }, 30, 'stashes');
        });

        db.collection('current_sales').onSnapshot(snapshot => {
            localSalesYJ = {};
            snapshot.forEach(doc => { localSalesYJ[doc.id] = doc.data(); });
            scheduleUI(function () {
                if (isSectionVisible('sales-yj') && typeof renderSalesYjTable === 'function') renderSalesYjTable();
                if (isAdminOpen() && typeof calculateManagementData === 'function') calculateManagementData();
            }, 30, 'sales_yj');
        });

        db.collection('current_sales_fen').onSnapshot(snapshot => {
            localSalesFen = {};
            snapshot.forEach(doc => { localSalesFen[doc.id] = doc.data(); });
            scheduleUI(function () {
                if (isSectionVisible('sales-fen') && typeof renderSalesFenTable === 'function') renderSalesFenTable();
                if (isAdminOpen() && typeof calculateManagementData === 'function') calculateManagementData();
            }, 30, 'sales_fen');
        });

        db.collection('current_salaries_status').onSnapshot(snapshot => {
            localSalariesStatus = {};
            snapshot.forEach(doc => { localSalariesStatus[doc.id] = doc.data().status || 'non_pagato'; });
            scheduleUI(function () {
                if (isAdminOpen() && typeof calculateManagementData === 'function') calculateManagementData();
            }, 30, 'salaries');
        });
    }, 80);

    // FASE 3: inventari
    setTimeout(function () {
        db.collection('inventory_items').onSnapshot(snapshot => {
            localInventoryYJ = {};
            snapshot.forEach(doc => { localInventoryYJ[doc.id] = doc.data(); });
            scheduleUI(function () {
                if (isSectionVisible('inventory-yj')) {
                    if (typeof renderInventoryYjGrid === 'function') renderInventoryYjGrid();
                    if (typeof renderInventoryYjDropdowns === 'function') renderInventoryYjDropdowns();
                }
            }, 20, 'inv_yj_items');
        });

        db.collection('inventory_logs').orderBy('timestamp', 'desc').limit(50).onSnapshot(snapshot => {
            localInventoryYJLogs = [];
            snapshot.forEach(doc => { localInventoryYJLogs.push({ id: doc.id, ...doc.data() }); });
            scheduleUI(function () {
                if (isSectionVisible('inventory-yj') && typeof renderInventoryYjLogs === 'function') renderInventoryYjLogs();
            }, 20, 'inv_yj_logs');
        });

        db.collection('fenici_items').onSnapshot(snapshot => {
            localInventoryFen = {};
            snapshot.forEach(doc => { localInventoryFen[doc.id] = doc.data(); });
            scheduleUI(function () {
                if (isSectionVisible('inventory-fen')) {
                    if (typeof renderInventoryFenGrid === 'function') renderInventoryFenGrid();
                    if (typeof renderInventoryFenDropdowns === 'function') renderInventoryFenDropdowns();
                }
            }, 20, 'inv_fen_items');
        });

        db.collection('fenici_logs').orderBy('timestamp', 'desc').limit(50).onSnapshot(snapshot => {
            localInventoryFenLogs = [];
            snapshot.forEach(doc => { localInventoryFenLogs.push({ id: doc.id, ...doc.data() }); });
            scheduleUI(function () {
                if (isSectionVisible('inventory-fen') && typeof renderInventoryFenLogs === 'function') renderInventoryFenLogs();
            }, 20, 'inv_fen_logs');
        });
    }, 200);

    // FASE 4: archivio + immagini (più pesanti)
    setTimeout(function () {
        db.collection('archive').onSnapshot(snapshot => {
            localArchive = {};
            snapshot.forEach(doc => { localArchive[doc.id] = doc.data(); });
            scheduleUI(function () {
                if (isSectionVisible('sales-yj') && typeof renderSalesArchiveWindowYJ === 'function') renderSalesArchiveWindowYJ(localArchive);
                if (isSectionVisible('sales-fen') && typeof renderSalesArchiveWindowFen === 'function') renderSalesArchiveWindowFen(localArchive);
                if (isAdminOpen() && typeof renderArchive === 'function') renderArchive(localArchive);
            }, 40, 'archive');
        });

        db.collection('item_images').onSnapshot(snapshot => {
            localItemImages = {};
            snapshot.forEach(doc => { localItemImages[doc.id] = doc.data(); });
            scheduleUI(function () {
                if (typeof renderItemImageSelects === 'function') renderItemImageSelects();
                if (isAdminOpen() && typeof renderItemImagesLibrary === 'function') renderItemImagesLibrary();
                if (isSectionVisible('inventory-yj') && typeof renderInventoryYjGrid === 'function') renderInventoryYjGrid();
                if (isSectionVisible('inventory-fen') && typeof renderInventoryFenGrid === 'function') renderInventoryFenGrid();
            }, 40, 'item_images');
        });
    }, 350);
}

// Protezione
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123) return false;
    if (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0))) return false;
    if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false;
};

// --- STASH DROPDOWNS ---
function renderStashDropdowns() {
    const yjAdmin = document.getElementById('inv-yj-admin-stash');
    const fenAdmin = document.getElementById('inv-fen-admin-stash');
    const yjFilter = document.getElementById('inv-yj-stash-filter');
    const fenFilter = document.getElementById('inv-fen-stash-filter');

    function optionsFor(activity) {
        // activity: 'yj' | 'fen'
        let opts = '';
        Object.keys(localStashes).forEach(key => {
            const s = localStashes[key];
            const showYJ = s.showYJ !== false; // default true se non specificato
            const showFen = s.showFen !== false;
            if (activity === 'yj' && !showYJ) return;
            if (activity === 'fen' && !showFen) return;
            opts += `<option value="${key}">${s.name}</option>`;
        });
        return opts;
    }

    if (yjAdmin) {
        const v = yjAdmin.value;
        const opts = optionsFor('yj');
        yjAdmin.innerHTML = opts || '<option value="">Nessun deposito YJ</option>';
        if (v && [...yjAdmin.options].some(o => o.value === v)) yjAdmin.value = v;
    }
    if (fenAdmin) {
        const v = fenAdmin.value;
        const opts = optionsFor('fen');
        fenAdmin.innerHTML = opts || '<option value="">Nessun deposito Fenici</option>';
        if (v && [...fenAdmin.options].some(o => o.value === v)) fenAdmin.value = v;
    }
    if (yjFilter) {
        const v = yjFilter.value;
        yjFilter.innerHTML = '<option value="all">Tutti i Depositi</option>' + optionsFor('yj');
        if (v) yjFilter.value = v;
    }
    if (fenFilter) {
        const v = fenFilter.value;
        fenFilter.innerHTML = '<option value="all">Tutti i Depositi</option>' + optionsFor('fen');
        if (v) fenFilter.value = v;
    }
}

function renderCustomStashesList() {
    const list = document.getElementById('custom-stashes-list');
    if (!list) return;
    const keys = Object.keys(localStashes);
    if (keys.length === 0) {
        list.innerHTML = '<p class="text-xs text-gray-500 italic">Nessun deposito personalizzato. Creane uno sopra.</p>';
        return;
    }
    list.innerHTML = '';
    keys.forEach(key => {
        const s = localStashes[key];
        const name = s.name || key;
        const hasFlags = ('showYJ' in s) || ('showFen' in s);
        let badges = '';
        if (!hasFlags) {
            badges = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">YJ</span> <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">Fenici</span>';
        } else {
            if (s.showYJ) badges += '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">YJ</span> ';
            if (s.showFen) badges += '<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">Fenici</span>';
        }
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between gap-3 px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-xl';
        row.innerHTML = `
            <div class="min-w-0 flex-1">
                <span class="text-sm text-gray-200 font-medium truncate block"><i class="fa-solid fa-warehouse text-amber-500/70 mr-2"></i></span>
                <div class="mt-1 flex flex-wrap gap-1">${badges}</div>
            </div>
            <button type="button" class="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition shrink-0" title="Elimina deposito">
                <i class="fa-solid fa-trash text-xs"></i>
            </button>`;
        row.querySelector('span.text-sm').appendChild(document.createTextNode(name));
        row.querySelector('button').addEventListener('click', () => window.deleteCustomStash(key, name));
        list.appendChild(row);
    });
}

window.deleteCustomStash = function(id, name) {
    showConfirmModal(
        "Elimina deposito",
        'Vuoi eliminare il deposito "' + name + '"? Gli oggetti già assegnati a questo deposito manterranno il riferimento, ma non comparirà più tra le opzioni.',
        () => {
            db.collection('custom_stashes').doc(id).delete()
                .then(() => showToast("Deposito eliminato.", "info"))
                .catch(err => showToast("Errore: " + err.message, "error"));
        },
        true
    );
};

const stashForm = document.getElementById('stash-form');
if (stashForm) {
    stashForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('stash-name').value.trim();
        if (!name) {
            showToast("Inserisci un nome per il deposito.", "warning");
            return;
        }
        const showYJ = document.getElementById('stash-show-yj') ? document.getElementById('stash-show-yj').checked : true;
        const showFen = document.getElementById('stash-show-fen') ? document.getElementById('stash-show-fen').checked : false;
        if (!showYJ && !showFen) {
            showToast("Seleziona almeno un inventario (YJ o Fenici).", "warning");
            return;
        }
        db.collection('custom_stashes').add({ name, showYJ, showFen })
            .then(() => {
                stashForm.reset();
                const yj = document.getElementById('stash-show-yj');
                const fen = document.getElementById('stash-show-fen');
                if (yj) yj.checked = true;
                if (fen) fen.checked = false;
                showToast("Deposito creato!", "success");
            })
            .catch(err => showToast("Errore: " + err.message, "error"));
    });
}

// --- LIBRERIA IMMAGINI ITEM (onclick sul bottone, niente form) ---
/** Limite file sorgente (prima della compressione). */
const MAX_ITEM_IMAGE_SOURCE_BYTES = 2.5 * 1024 * 1024;
/** Dopo compressione: target massimo salvato in Firestore. */
const MAX_ITEM_IMAGE_BYTES = 120 * 1024;
/** Lato massimo thumbnail (icone inventario). */
const ITEM_IMAGE_MAX_PX = 160;

/**
 * Ridimensiona e comprime un'immagine (mantiene trasparenza PNG se presente).
 * Riduce drasticamente memoria Firestore e lag del browser.
 */
function compressImageToDataUrl(file, maxPx, maxBytes) {
    maxPx = maxPx || ITEM_IMAGE_MAX_PX;
    maxBytes = maxBytes || MAX_ITEM_IMAGE_BYTES;
    return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
            try {
                var w = img.naturalWidth || img.width;
                var h = img.naturalHeight || img.height;
                var scale = Math.min(1, maxPx / Math.max(w, h));
                var tw = Math.max(1, Math.round(w * scale));
                var th = Math.max(1, Math.round(h * scale));
                var canvas = document.createElement('canvas');
                canvas.width = tw;
                canvas.height = th;
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, tw, th);
                ctx.drawImage(img, 0, 0, tw, th);
                URL.revokeObjectURL(url);

                var dataUrl = canvas.toDataURL('image/png');
                if (dataUrl.length > maxBytes * 1.37) {
                    var jpeg = canvas.toDataURL('image/jpeg', 0.82);
                    if (jpeg.length < dataUrl.length) dataUrl = jpeg;
                }
                if (dataUrl.length > maxBytes * 1.37 && maxPx > 96) {
                    compressImageToDataUrl(file, Math.floor(maxPx * 0.75), maxBytes).then(resolve).catch(reject);
                    return;
                }
                resolve(dataUrl);
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };
        img.onerror = function () {
            URL.revokeObjectURL(url);
            reject(new Error('Impossibile leggere l\'immagine'));
        };
        img.src = url;
    });
}

/** Comprime un dataUrl già in memoria (item vecchi senza match in libreria). */
function compressDataUrlToThumb(dataUrl, maxPx, maxBytes) {
    maxPx = maxPx || ITEM_IMAGE_MAX_PX;
    maxBytes = maxBytes || MAX_ITEM_IMAGE_BYTES;
    return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
            try {
                var w = img.naturalWidth || img.width;
                var h = img.naturalHeight || img.height;
                var scale = Math.min(1, maxPx / Math.max(w, h, 1));
                var tw = Math.max(1, Math.round(w * scale));
                var th = Math.max(1, Math.round(h * scale));
                var canvas = document.createElement('canvas');
                canvas.width = tw;
                canvas.height = th;
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, tw, th);
                ctx.drawImage(img, 0, 0, tw, th);
                var out = canvas.toDataURL('image/png');
                if (out.length > maxBytes * 1.37) {
                    var jpeg = canvas.toDataURL('image/jpeg', 0.8);
                    if (jpeg.length < out.length) out = jpeg;
                }
                if (out.length > maxBytes * 1.37 && maxPx > 80) {
                    compressDataUrlToThumb(dataUrl, Math.floor(maxPx * 0.7), maxBytes).then(resolve).catch(reject);
                    return;
                }
                resolve(out);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = function () { reject(new Error('DataUrl non leggibile')); };
        img.src = dataUrl;
    });
}

function renderItemImageSelects() {
    const opts = ['<option value="">— Nessuna / placeholder —</option>'];
    Object.keys(localItemImages).sort(function (a, b) {
        return (localItemImages[a].fileName || '').localeCompare(localItemImages[b].fileName || '', undefined, { sensitivity: 'base' });
    }).forEach(function (id) {
        opts.push('<option value="' + id + '">' + (localItemImages[id].fileName || id) + '</option>');
    });
    const htmlOpts = opts.join('');
    ['inv-yj-admin-img', 'inv-fen-admin-img'].forEach(function (selId) {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = htmlOpts;
        if (prev && Array.prototype.some.call(sel.options, function (o) { return o.value === prev; })) sel.value = prev;
    });
}

function renderItemImagesLibrary() {
    const grid = document.getElementById('item-images-grid');
    if (!grid) return;
    const keys = Object.keys(localItemImages);
    if (keys.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-xs text-gray-500 italic">Nessuna immagine caricata.</p>';
        return;
    }
    keys.sort(function (a, b) { return (localItemImages[b].createdAt || 0) - (localItemImages[a].createdAt || 0); });
    grid.innerHTML = '';
    keys.forEach(function (id) {
        const img = localItemImages[id];
        const name = img.fileName || 'file.png';
        const card = document.createElement('div');
        card.className = 'relative bg-gray-900 border border-gray-700 rounded-xl overflow-hidden group';
        card.innerHTML =
            '<div class="h-20 flex items-center justify-center bg-gray-950 p-2">' +
            '<img src="' + (img.dataUrl || '') + '" alt="" loading="lazy" decoding="async" class="max-h-full max-w-full object-contain">' +
            '</div><div class="p-2 border-t border-gray-800">' +
            '<p class="text-[11px] text-amber-400 font-mono truncate">' + name + '</p>' +
            (img.size ? '<p class="text-[9px] text-gray-500">' + Math.round((img.size || 0) / 1024) + ' KB</p>' : '') +
            '</div>' +
            '<button type="button" class="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition" title="Elimina"><i class="fa-solid fa-trash"></i></button>';
        card.querySelector('button').addEventListener('click', function () {
            showConfirmModal('Elimina immagine', 'Rimuovere "' + name + '" dalla libreria?', function () {
                db.collection('item_images').doc(id).delete()
                    .then(function () { showToast('Immagine rimossa.', 'info'); })
                    .catch(function (err) { showToast(err.message, 'error'); });
            }, true);
        });
        grid.appendChild(card);
    });
}

function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { reject(new Error('Lettura fallita: ' + file.name)); };
        reader.readAsDataURL(file);
    });
}

window.uploadItemImagesFromInput = async function uploadItemImagesFromInput() {
    console.log('[Fenici] upload immagini avviato', { role: userRole });
    try {
        if (userRole !== 'gestore') {
            showToast('Solo il gestore può caricare immagini. Accedi come gestore.', 'error');
            return;
        }
        var fileInput = document.getElementById('item-image-file');
        var files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
        if (files.length === 0) {
            showToast('Seleziona uno o più file PNG prima di caricare.', 'warning');
            return;
        }

        var btn = document.getElementById('item-image-upload-btn');
        var statusEl = document.getElementById('item-image-status');
        var prevHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Carico...';
        }
        if (statusEl) {
            statusEl.classList.remove('hidden');
            statusEl.textContent = 'Caricamento in corso...';
        }

        var ok = 0, skip = 0, fail = 0;
        var existingNames = new Set(
            Object.values(localItemImages).map(function (i) { return (i.fileName || '').toLowerCase(); })
        );

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> ' + (i + 1) + '/' + files.length;
            if (statusEl) statusEl.textContent = 'Carico ' + (i + 1) + ' di ' + files.length + ': ' + file.name;

            var isImg = /image\/(png|jpeg|jpg|webp)/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
            if (!isImg) { skip++; continue; }
            if (file.size > MAX_ITEM_IMAGE_SOURCE_BYTES) {
                showToast('"' + file.name + '" troppo grande (' + Math.round(file.size / 1024) + ' KB). Max sorgente ~2,5 MB (verrà compressa).', 'warning');
                skip++;
                continue;
            }
            var baseName = file.name.replace(/[^\w.\-()+ ]+/g, '_');
            if (existingNames.has(baseName.toLowerCase())) {
                showToast('"' + baseName + '" già in libreria, saltato.', 'info');
                skip++;
                continue;
            }
            try {
                var dataUrl = await compressImageToDataUrl(file, ITEM_IMAGE_MAX_PX, MAX_ITEM_IMAGE_BYTES);
                var approxBytes = Math.round((dataUrl.length * 3) / 4);
                await db.collection('item_images').add({
                    fileName: baseName,
                    dataUrl: dataUrl,
                    size: approxBytes,
                    width: ITEM_IMAGE_MAX_PX,
                    createdAt: Date.now()
                });
                existingNames.add(baseName.toLowerCase());
                ok++;
            } catch (err) {
                fail++;
                console.error(err);
                var msg = (err && err.message) ? err.message : String(err);
                if (msg.indexOf('permission') !== -1 || (err && err.code === 'permission-denied')) {
                    showToast('Permesso negato su item_images. Controlla le regole Firestore e di essere loggato come gestore.', 'error');
                } else {
                    showToast('Errore su "' + file.name + '": ' + msg, 'error');
                }
            }
        }

        if (fileInput) fileInput.value = '';
        if (btn) { btn.disabled = false; btn.innerHTML = prevHtml; }
        if (statusEl) {
            statusEl.textContent = ok > 0
                ? ('Completato: ' + ok + ' caricate' + (skip ? ', ' + skip + ' saltate' : '') + '.')
                : 'Nessuna immagine nuova caricata.';
        }

        if (ok > 0) showToast('Caricate ' + ok + ' immagini' + (skip ? ' (' + skip + ' saltate)' : '') + '.', 'success');
        else if (skip > 0 && fail === 0) showToast('Nessuna nuova immagine (già presenti o non valide).', 'warning');
        else if (fail > 0) showToast('Caricamento fallito. Vedi console (F12).', 'error');
    } catch (err) {
        console.error('uploadItemImagesFromInput', err);
        showToast('Errore upload: ' + ((err && err.message) || err), 'error');
        var btn2 = document.getElementById('item-image-upload-btn');
        if (btn2) {
            btn2.disabled = false;
            btn2.innerHTML = '<i class="fa-solid fa-upload mr-1"></i> Carica PNG';
        }
    }
};

/**
 * Collega gli oggetti inventario alla libreria immagini (per nome file / imageId)
 * e rimuove i dataUrl pesanti dai documenti item. Solo gestore.
 * Flusso: 1) ricarica immagini compresse in libreria (stesso nome file)
 *         2) premi questo pulsante
 */
window.optimizeInventoryItemImages = async function optimizeInventoryItemImages() {
    if (userRole !== 'gestore') {
        showToast('Solo il gestore può ottimizzare le immagini inventario.', 'error');
        return;
    }
    const libKeys = Object.keys(localItemImages);
    if (libKeys.length === 0) {
        showToast('Libreria vuota. Prima carica le immagini compresse.', 'warning');
        return;
    }

    const statusEl = document.getElementById('optimize-inventory-status');
    const btn = document.getElementById('optimize-inventory-images-btn');
    const prevHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Ottimizzo...';
    }
    if (statusEl) {
        statusEl.classList.remove('hidden');
        statusEl.textContent = 'Analisi oggetti inventario...';
    }

    try {
        // Mappa libreria: nome file normalizzato → { id, dataUrl, fileName, size }
        const byName = {};
        libKeys.forEach(function (id) {
            const img = localItemImages[id];
            const fn = (img.fileName || '').trim().toLowerCase();
            if (fn) byName[fn] = { id: id, dataUrl: img.dataUrl || '', fileName: img.fileName || '', size: img.size || 0 };
        });

        function findLibMatch(item) {
            if (item.imageId && localItemImages[item.imageId]) {
                const img = localItemImages[item.imageId];
                return { id: item.imageId, dataUrl: img.dataUrl || '', fileName: img.fileName || item.imageFileName || '', size: img.size || 0 };
            }
            const fn = (item.imageFileName || '').trim().toLowerCase();
            if (fn && byName[fn]) return byName[fn];
            // Prova nome oggetto ≈ nome file (senza estensione)
            const nameKey = (item.name || '').trim().toLowerCase();
            if (nameKey) {
                for (const fn in byName) {
                    const base = fn.replace(/\.(png|jpe?g|webp)$/i, '');
                    if (base === nameKey || fn === nameKey) return byName[fn];
                }
            }
            return null;
        }

        function needsOptimize(item, match) {
            if (!match) return false;
            // Ha dataUrl grosso oppure manca imageId o imageUrl non allineato
            const heavy = item.imageUrl && item.imageUrl.length > 55000;
            const missingId = !item.imageId || item.imageId !== match.id;
            const hasEmbedded = !!(item.imageUrl && item.imageUrl.indexOf('data:') === 0);
            return heavy || missingId || hasEmbedded;
        }

        const jobs = [];
        Object.keys(localInventoryYJ).forEach(function (id) {
            const item = localInventoryYJ[id];
            const match = findLibMatch(item);
            if (match && needsOptimize(item, match)) {
                jobs.push({ collection: 'inventory_items', id: id, match: match, name: item.name, mode: 'link' });
            } else if (!match && item.imageUrl && item.imageUrl.indexOf('data:') === 0 && item.imageUrl.length > 55000) {
                jobs.push({ collection: 'inventory_items', id: id, name: item.name, mode: 'compress', imageUrl: item.imageUrl });
            }
        });
        Object.keys(localInventoryFen).forEach(function (id) {
            const item = localInventoryFen[id];
            const match = findLibMatch(item);
            if (match && needsOptimize(item, match)) {
                jobs.push({ collection: 'fenici_items', id: id, match: match, name: item.name, mode: 'link' });
            } else if (!match && item.imageUrl && item.imageUrl.indexOf('data:') === 0 && item.imageUrl.length > 55000) {
                jobs.push({ collection: 'fenici_items', id: id, name: item.name, mode: 'compress', imageUrl: item.imageUrl });
            }
        });

        if (jobs.length === 0) {
            showToast('Nessun item da ottimizzare (già collegati o nessun match per nome file).', 'info');
            if (statusEl) statusEl.textContent = 'Nessuna modifica necessaria. Controlla che i nomi file in libreria coincidano con imageFileName degli item.';
            if (btn) { btn.disabled = false; btn.innerHTML = prevHtml; }
            return;
        }

        const nLink = jobs.filter(function (j) { return j.mode === 'link'; }).length;
        const nComp = jobs.filter(function (j) { return j.mode === 'compress'; }).length;

        showConfirmModal(
            'Ottimizza immagini inventario',
            'Trovati ' + jobs.length + ' oggetti: ' + nLink + ' collegabili alla libreria, ' + nComp + ' da comprimere sul posto. Continuare?',
            async function () {
                let done = 0;
                let fail = 0;

                // 1) Job "link" in batch
                const linkJobs = jobs.filter(function (j) { return j.mode === 'link'; });
                const chunkSize = 200;
                for (let i = 0; i < linkJobs.length; i += chunkSize) {
                    const chunk = linkJobs.slice(i, i + chunkSize);
                    const batch = db.batch();
                    chunk.forEach(function (job) {
                        const ref = db.collection(job.collection).doc(job.id);
                        const update = {
                            imageId: job.match.id,
                            imageFileName: job.match.fileName || ''
                        };
                        if (job.match.dataUrl && job.match.dataUrl.length < 55000) {
                            update.imageUrl = job.match.dataUrl;
                        } else {
                            update.imageUrl = firebase.firestore.FieldValue.delete();
                        }
                        batch.update(ref, update);
                    });
                    try {
                        await batch.commit();
                        done += chunk.length;
                        if (statusEl) statusEl.textContent = 'Collegati ' + done + ' / ' + jobs.length + '...';
                    } catch (err) {
                        console.error(err);
                        fail += chunk.length;
                    }
                }

                // 2) Job "compress" uno a uno (canvas)
                const compJobs = jobs.filter(function (j) { return j.mode === 'compress'; });
                for (let i = 0; i < compJobs.length; i++) {
                    const job = compJobs[i];
                    if (statusEl) statusEl.textContent = 'Comprimo ' + (i + 1) + '/' + compJobs.length + ': ' + (job.name || job.id);
                    try {
                        const compressed = await compressDataUrlToThumb(job.imageUrl, ITEM_IMAGE_MAX_PX, MAX_ITEM_IMAGE_BYTES);
                        await db.collection(job.collection).doc(job.id).update({ imageUrl: compressed });
                        done++;
                    } catch (err) {
                        console.error(err);
                        fail++;
                    }
                }

                if (btn) { btn.disabled = false; btn.innerHTML = prevHtml; }
                if (fail === 0) {
                    showToast('Ottimizzati ' + done + ' oggetti inventario!', 'success');
                    if (statusEl) statusEl.textContent = 'Completato: ' + done + ' item aggiornati (libreria + compressione).';
                } else {
                    showToast('Completati ' + done + ', errori su ~' + fail + '.', 'warning');
                    if (statusEl) statusEl.textContent = 'Parziale: ok ' + done + ', errori ' + fail + '.';
                }
            },
            false
        );

        // Se l'utente annulla, riabilita il bottone quando chiude il modal
        // (il confirm gestisce solo onConfirm; riabilita dopo un po' se ancora disabled)
        setTimeout(function () {
            if (btn && btn.disabled) {
                // Modal ancora aperto o annullato: se annullato modalCallback null dopo close
            }
        }, 100);
        // Riabilita sempre dopo chiusura modal via listener una tantum
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const onCancelReenable = function () {
            if (btn) { btn.disabled = false; btn.innerHTML = prevHtml; }
            cancelBtn.removeEventListener('click', onCancelReenable);
        };
        if (cancelBtn) cancelBtn.addEventListener('click', onCancelReenable);

    } catch (err) {
        console.error('optimizeInventoryItemImages', err);
        showToast('Errore ottimizzazione: ' + ((err && err.message) || err), 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = prevHtml; }
        if (statusEl) statusEl.textContent = 'Errore: ' + ((err && err.message) || err);
    }
};


// --- EMPLOYEE DROPDOWNS ---
function renderAllEmployeeDropdowns() {
    let opts = '<option value="">-- Seleziona Operatore --</option>';
    Object.keys(localEmployees).forEach(key => {
        opts += `<option value="${key}">${localEmployees[key].name}</option>`;
    });
    ['sale-yj-employee', 'sale-fen-employee', 'inv-yj-emp-select', 'inv-fen-emp-select'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opts;
    });
}

function renderAdminFilterDropdown() {
    const current = adminEmployeeFilter ? adminEmployeeFilter.value : 'all';
    if (adminEmployeeFilter) {
        adminEmployeeFilter.innerHTML = '<option value="all">📊 MOSTRA TUTTO LO STAFF</option>';
        Object.keys(localEmployees).forEach(key => {
            adminEmployeeFilter.innerHTML += `<option value="${key}">👤 ${localEmployees[key].name}</option>`;
        });
        adminEmployeeFilter.value = current;
    }
    // Filters for sales tables
    ['sales-yj-employee-filter', 'sales-fen-employee-filter', 'archive-window-yj-employee-filter', 'archive-window-fen-employee-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const cur = el.value;
            el.innerHTML = '<option value="all">📊 Tutti i Dipendenti</option>';
            Object.keys(localEmployees).forEach(key => {
                el.innerHTML += `<option value="${key}">👤 ${localEmployees[key].name}</option>`;
            });
            el.value = cur || 'all';
        }
    });
}

if (adminEmployeeFilter) adminEmployeeFilter.addEventListener('change', calculateManagementData);
document.getElementById('sales-yj-employee-filter')?.addEventListener('change', renderSalesYjTable);
document.getElementById('sales-fen-employee-filter')?.addEventListener('change', renderSalesFenTable);
document.getElementById('archive-window-yj-employee-filter')?.addEventListener('change', () => renderSalesArchiveWindowYJ(localArchive));
document.getElementById('archive-window-fen-employee-filter')?.addEventListener('change', () => renderSalesArchiveWindowFen(localArchive));

// --- QUICK SALES GRIDS ---
function renderQuickSalesYjGrid() {
    const container = document.getElementById('quick-sales-yj-grid');
    if (!container) return;
    container.innerHTML = `
        <div onclick="openSmartModal('sale_custom_yj', null)" class="bg-gray-800/80 border border-gray-600 rounded-xl p-4 cursor-pointer hover:border-amber-500 transition-all flex flex-col items-center justify-center text-center group min-h-[110px] shadow-lg">
            <div class="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-amber-500 transition-colors">
                <i class="fa-solid fa-plus text-xl text-amber-500 group-hover:text-gray-900"></i>
            </div>
            <span class="font-extrabold text-amber-400 text-xs uppercase">Vendita Libera</span>
        </div>
    `;
    Object.keys(localCatalogYJ).forEach(key => {
        const item = localCatalogYJ[key];
        container.innerHTML += `
            <div onclick="openSmartModal('sale_catalog_yj', '${key}')" class="bg-gray-800/80 border border-gray-600 rounded-xl p-4 cursor-pointer hover:border-emerald-500 transition-all flex flex-col items-center justify-center text-center group min-h-[110px] shadow-lg">
                <i class="fa-solid fa-tag text-2xl text-gray-500 mb-2 group-hover:text-emerald-400"></i>
                <span class="font-bold text-gray-200 text-sm leading-tight">${item.name}</span>
                <span class="text-emerald-400 text-xs font-bold mt-1 bg-emerald-400/10 px-2 py-0.5 rounded">${formatValuta(item.price)}</span>
            </div>
        `;
    });
}

function renderQuickSalesFenGrid() {
    const container = document.getElementById('quick-sales-fen-grid');
    if (!container) return;
    container.innerHTML = `
        <div onclick="openSmartModal('sale_custom_fen', null)" class="bg-gray-800/80 border border-gray-600 rounded-xl p-4 cursor-pointer hover:border-amber-500 transition-all flex flex-col items-center justify-center text-center group min-h-[110px] shadow-lg">
            <div class="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 group-hover:bg-amber-500 transition-colors">
                <i class="fa-solid fa-plus text-xl text-amber-500 group-hover:text-gray-900"></i>
            </div>
            <span class="font-extrabold text-amber-400 text-xs uppercase">Vendita Libera</span>
        </div>
    `;
    Object.keys(localCatalogFen).forEach(key => {
        const item = localCatalogFen[key];
        container.innerHTML += `
            <div onclick="openSmartModal('sale_catalog_fen', '${key}')" class="bg-gray-800/80 border border-gray-600 rounded-xl p-4 cursor-pointer hover:border-emerald-500 transition-all flex flex-col items-center justify-center text-center group min-h-[110px] shadow-lg">
                <i class="fa-solid fa-tag text-2xl text-gray-500 mb-2 group-hover:text-emerald-400"></i>
                <span class="font-bold text-gray-200 text-sm leading-tight">${item.name}</span>
                <span class="text-emerald-400 text-xs font-bold mt-1 bg-emerald-400/10 px-2 py-0.5 rounded">${formatValuta(item.price)}</span>
            </div>
        `;
    });
}

// --- SALES DROPDOWNS ---
function renderSalesYjDropdowns() {
    const sel = document.getElementById('sale-yj-service-select');
    if (!sel) return;
    sel.innerHTML = '<option value="custom">-- VENDITA LIBERA --</option>';
    Object.keys(localCatalogYJ).forEach(key => {
        const item = localCatalogYJ[key];
        sel.innerHTML += `<option value="${key}">${item.name} (${formatValuta(item.price)})</option>`;
    });
}

function renderSalesFenDropdowns() {
    const sel = document.getElementById('sale-fen-service-select');
    if (!sel) return;
    sel.innerHTML = '<option value="custom">-- VENDITA LIBERA --</option>';
    Object.keys(localCatalogFen).forEach(key => {
        const item = localCatalogFen[key];
        sel.innerHTML += `<option value="${key}">${item.name} (${formatValuta(item.price)})</option>`;
    });
}

// Custom name toggle for YJ
document.getElementById('sale-yj-service-select')?.addEventListener('change', (e) => {
    const field = document.getElementById('custom-name-field-yj');
    const price = document.getElementById('sale-yj-custom-price');
    const label = document.getElementById('price-label-text-yj');
    if (e.target.value === 'custom') {
        field.classList.remove('hidden');
        price.disabled = false;
        price.value = "";
        label.textContent = "Costo Totale (€)";
    } else {
        field.classList.add('hidden');
        price.disabled = true;
        label.textContent = "Costo Unitario Preimpostato (€)";
        const item = localCatalogYJ[e.target.value];
        if (item) price.value = item.price;
    }
});

document.getElementById('sale-fen-service-select')?.addEventListener('change', (e) => {
    const field = document.getElementById('custom-name-field-fen');
    const price = document.getElementById('sale-fen-custom-price');
    const label = document.getElementById('price-label-text-fen');
    if (e.target.value === 'custom') {
        field.classList.remove('hidden');
        price.disabled = false;
        price.value = "";
        label.textContent = "Costo Totale (€)";
    } else {
        field.classList.add('hidden');
        price.disabled = true;
        label.textContent = "Costo Unitario Preimpostato (€)";
        const item = localCatalogFen[e.target.value];
        if (item) price.value = item.price;
    }
});

// --- SALE FORMS ---
function handleSaleSubmit(e, isYJ) {
    e.preventDefault();
    const empSelect = document.getElementById(isYJ ? 'sale-yj-employee' : 'sale-fen-employee');
    const serviceSelect = document.getElementById(isYJ ? 'sale-yj-service-select' : 'sale-fen-service-select');
    const qtyInput = document.getElementById(isYJ ? 'sale-yj-quantity' : 'sale-fen-quantity');
    const customName = document.getElementById(isYJ ? 'sale-yj-custom-name' : 'sale-fen-custom-name');
    const customPrice = document.getElementById(isYJ ? 'sale-yj-custom-price' : 'sale-fen-custom-price');
    const catalog = isYJ ? localCatalogYJ : localCatalogFen;
    const collection = isYJ ? 'current_sales' : 'current_sales_fen';

    const empKey = empSelect.value;
    const serviceKey = serviceSelect.value;
    const quantity = parseInt(qtyInput.value) || 1;

    if (!empKey) {
        showToast("Seleziona un dipendente!", "warning");
        return;
    }

    let saleData = {
        timestamp: Date.now(),
        dateString: new Date().toLocaleString('it-IT'),
        employeeKey: empKey,
        employeeName: localEmployees[empKey].name,
        quantity: quantity,
        activity: isYJ ? 'yellow_jack' : 'fenici'
    };

    const empPct = localEmployees[empKey].customPercentage ? parseFloat(localEmployees[empKey].customPercentage) : 40;
    saleData.appliedPercentage = empPct;

    if (serviceKey === 'custom') {
        const name = customName.value.trim();
        const totalCostInput = parseFloat(customPrice.value);
        if (!name || isNaN(totalCostInput)) {
            showToast("Compila nome e importo.", "warning");
            return;
        }
        const finalTotalPrice = totalCostInput * quantity;
        const yellowGain = finalTotalPrice;
        const employeeGain = (yellowGain * empPct) / 100;
        saleData.serviceName = "[LIBERO] " + name;
        saleData.totalPrice = finalTotalPrice;
        saleData.yellowCost = 0;
        saleData.yellowGain = yellowGain;
        saleData.employeeGain = employeeGain;
    } else {
        const item = catalog[serviceKey];
        const finalTotalPrice = item.price * quantity;
        const finalYellowCost = (item.cost || 0) * quantity;
        const yellowGain = finalTotalPrice - finalYellowCost;
        const employeeGain = (yellowGain * empPct) / 100;
        saleData.serviceName = item.name;
        saleData.totalPrice = finalTotalPrice;
        saleData.yellowCost = finalYellowCost;
        saleData.yellowGain = yellowGain;
        saleData.employeeGain = employeeGain;
    }

    db.collection(collection).add(saleData)
        .then(() => {
            e.target.reset();
            qtyInput.value = "1";
            showToast("Vendita registrata!", "success");
        })
        .catch(err => showToast("Errore: " + err.message, "error"));
}

document.getElementById('sale-yj-form')?.addEventListener('submit', (e) => handleSaleSubmit(e, true));
document.getElementById('sale-fen-form')?.addEventListener('submit', (e) => handleSaleSubmit(e, false));

// --- RENDER SALES TABLES ---
function renderSalesTableGeneric(tbodyId, salesObj, filterId, isYJ) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';
    const filterVal = document.getElementById(filterId)?.value || 'all';
    let salesArray = Object.keys(salesObj).map(key => ({ key, ...salesObj[key] }));
    const startOfWeek = getStartOfCurrentWeek();
    salesArray = salesArray.filter(s => s.timestamp >= startOfWeek);
    if (filterVal !== 'all') salesArray = salesArray.filter(s => s.employeeKey === filterVal);
    salesArray.sort((a, b) => b.timestamp - a.timestamp);

    if (salesArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500 text-xs">Nessuna operazione in questa settimana.</td></tr>`;
        return;
    }

    const canDelete = userRole === 'gestore';
    salesArray.forEach(sale => {
        const isFree = sale.isFreeSale || (sale.serviceName && String(sale.serviceName).startsWith('[LIBERO]'));
        let totaleCell, yellowCell, spettCell;
        if (isFree && sale.priceWithoutPct != null) {
            totaleCell = `<div class="leading-tight"><div class="text-emerald-400 font-bold">${formatValuta(sale.totalPrice)}</div><div class="text-[10px] text-gray-500">con ${sale.freePercentage}% Y</div><div class="text-[10px] text-gray-400">senza: ${formatValuta(sale.priceWithoutPct)}</div></div>`;
            yellowCell = `<span class="text-amber-400 font-semibold">${formatValuta(sale.yellowGain)}</span><div class="text-[10px] text-gray-500">${sale.freePercentage}% su base</div>`;
            spettCell = `<span class="text-indigo-400 font-semibold">${formatValuta(sale.employeeGain)}</span> <span class="text-[10px] text-gray-500">(${sale.appliedPercentage}% pers.)</span>`;
        } else {
            totaleCell = `<span class="text-emerald-400 font-bold">${formatValuta(sale.totalPrice)}</span>`;
            yellowCell = formatValuta(sale.yellowGain);
            spettCell = `${formatValuta(sale.employeeGain)} <span class="text-[10px] text-gray-500">(${sale.appliedPercentage}%)</span>`;
        }
        const deleteBtn = canDelete
            ? `<button onclick="window.deleteSaleItem('${sale.key}', ${isYJ})" class="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition" title="Elimina vendita (solo gestore)">
                    <i class="fa-solid fa-trash text-[10px]"></i>
               </button>`
            : '';
        tbody.innerHTML += `
            <tr class="hover:bg-gray-750/50 transition border-b border-gray-800">
                <td class="py-3 text-xs text-gray-400">${sale.dateString.split(',')[0]}</td>
                <td class="py-3 font-semibold text-amber-400">${sale.employeeName}</td>
                <td class="py-3 text-gray-300 text-xs">${sale.serviceName} <span class="text-[10px] text-gray-500">x${sale.quantity || 1}</span></td>
                <td class="py-3">${totaleCell}</td>
                <td class="py-3">${yellowCell}</td>
                <td class="py-3 text-indigo-400 font-semibold">${spettCell}</td>
                <td class="py-3 text-right">${deleteBtn}</td>
            </tr>
        `;
    });
}

function renderSalesYjTable() {
    renderSalesTableGeneric('current-sales-yj-table', localSalesYJ, 'sales-yj-employee-filter', true);
}
function renderSalesFenTable() {
    renderSalesTableGeneric('current-sales-fen-table', localSalesFen, 'sales-fen-employee-filter', false);
}

window.deleteSaleItem = function(key, isYJ) {
    if (userRole !== 'gestore') {
        showToast("Solo il gestore può eliminare le vendite.", "error");
        return;
    }
    const sales = isYJ ? localSalesYJ : localSalesFen;
    const collection = isYJ ? 'current_sales' : 'current_sales_fen';
    const sale = sales[key];
    if (!sale) return;
    showConfirmModal("Elimina Vendita", `Eliminare la vendita di "${sale.serviceName}" di ${sale.employeeName}? L'operazione non è reversibile.`, () => {
        db.collection(collection).doc(key).delete()
            .then(() => showToast("Vendita rimossa.", "info"))
            .catch(err => showToast(err.message, "error"));
    }, true);
};

// --- ARCHIVE WINDOWS ---
function renderSalesArchiveWindowGeneric(containerId, filterId, activityFilter) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const filterVal = document.getElementById(filterId)?.value || 'all';
    const items = Object.keys(localArchive).map(k => ({ key: k, ...localArchive[k] }));
    items.sort((a, b) => b.timestamp - a.timestamp);

    if (items.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-gray-500 text-xs">Nessun archivio.</div>`;
        return;
    }

    items.forEach(item => {
        let weekSales = Object.keys(item.sales || {}).map(sk => item.sales[sk]);
        if (activityFilter) {
            weekSales = weekSales.filter(s => (s.activity || 'yellow_jack') === activityFilter);
        }
        if (filterVal !== 'all') weekSales = weekSales.filter(s => s.employeeKey === filterVal);
        if (weekSales.length === 0) return;
        weekSales.sort((a, b) => b.timestamp - a.timestamp);

        let rows = '';
        weekSales.forEach(sale => {
            const isFree = sale.isFreeSale || (sale.serviceName && String(sale.serviceName).startsWith('[LIBERO]'));
            let lordoCell, yellowCell, spettCell;
            if (isFree && sale.priceWithoutPct != null) {
                lordoCell = `<div class="leading-tight"><span class="text-emerald-400 font-bold">${formatValuta(sale.totalPrice)}</span><div class="text-[9px] text-gray-500">con ${sale.freePercentage}% Y · senza ${formatValuta(sale.priceWithoutPct)}</div></div>`;
                yellowCell = `${formatValuta(sale.yellowGain)} <span class="text-[9px] text-amber-400">(${sale.freePercentage}%)</span>`;
                spettCell = `${formatValuta(sale.employeeGain)} <span class="text-[9px] text-gray-500">(${sale.appliedPercentage}% pers.)</span>`;
            } else {
                lordoCell = formatValuta(sale.totalPrice);
                yellowCell = formatValuta(sale.yellowGain);
                spettCell = formatValuta(sale.employeeGain);
            }
            rows += `
                <tr class="hover:bg-gray-800/80 border-b border-gray-800/50">
                    <td class="py-2 px-2 text-xs text-gray-400">${sale.dateString}</td>
                    <td class="py-2 px-2 text-xs font-bold text-amber-400">${sale.employeeName}</td>
                    <td class="py-2 px-2 text-xs text-gray-200">${sale.serviceName} <span class="text-[10px] text-gray-500">x${sale.quantity || 1}</span></td>
                    <td class="py-2 px-2 text-xs text-emerald-400 font-bold">${lordoCell}</td>
                    <td class="py-2 px-2 text-xs text-gray-400">${yellowCell}</td>
                    <td class="py-2 px-2 text-xs text-indigo-400 font-bold">${spettCell}</td>
                </tr>
            `;
        });

        const block = document.createElement('div');
        block.className = "bg-gray-800/40 p-4 rounded-xl border border-gray-700/70 shadow-inner";
        block.innerHTML = `
            <div class="flex justify-between items-center border-b border-gray-700 pb-2 mb-3">
                <h3 class="text-xs font-extrabold text-amber-400 uppercase tracking-wider"><i class="fa-solid fa-calendar-check mr-2 text-gray-400"></i> ${item.title}</h3>
                <span class="text-[10px] font-bold px-2 py-0.5 bg-gray-800 rounded-full border border-gray-700 text-gray-400">${weekSales.length} record</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-gray-700 bg-gray-900/40 text-gray-400 text-[10px] uppercase">
                            <th class="py-2 px-2">Data</th><th class="py-2 px-2">Dipendente</th><th class="py-2 px-2">Servizio</th>
                            <th class="py-2 px-2">Lordo</th><th class="py-2 px-2">Guadagno Y</th><th class="py-2 px-2">Spett. Staff</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        container.appendChild(block);
    });

    if (container.children.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-gray-500 text-xs italic">Nessun dato corrispondente.</div>`;
    }
}

function renderSalesArchiveWindowYJ(archive) {
    renderSalesArchiveWindowGeneric('archive-window-yj-weeks-container', 'archive-window-yj-employee-filter', 'yellow_jack');
}
function renderSalesArchiveWindowFen(archive) {
    renderSalesArchiveWindowGeneric('archive-window-fen-weeks-container', 'archive-window-fen-employee-filter', 'fenici');
}

// --- CATALOGHI ---
function setupCatalogForm(formId, idField, nameField, priceField, costField, submitBtnId, collection, localObj, renderFn) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById(idField).value;
        const name = document.getElementById(nameField).value.trim();
        const price = parseFloat(document.getElementById(priceField).value);
        const cost = parseFloat(document.getElementById(costField).value);
        const data = { name, price, cost };
        const btn = document.getElementById(submitBtnId);

        if (id) {
            db.collection(collection).doc(id).set(data)
                .then(() => { form.reset(); document.getElementById(idField).value = ''; btn.textContent = btn.textContent.replace('Salva Modifiche', 'Aggiungi al Catalogo'); showToast("Modificato!", "success"); })
                .catch(err => showToast(err.message, "error"));
        } else {
            db.collection(collection).add(data)
                .then(() => { form.reset(); showToast("Aggiunto al catalogo!", "success"); })
                .catch(err => showToast(err.message, "error"));
        }
    });
}

setupCatalogForm('catalog-yj-form', 'catalog-yj-id', 'catalog-yj-name', 'catalog-yj-price', 'catalog-yj-cost', 'catalog-yj-submit-btn', 'catalog', localCatalogYJ, renderCatalogYJ);
setupCatalogForm('catalog-fen-form', 'catalog-fen-id', 'catalog-fen-name', 'catalog-fen-price', 'catalog-fen-cost', 'catalog-fen-submit-btn', 'catalog_fen', localCatalogFen, renderCatalogFen);

window.editCatalogItem = function(key, isYJ) {
    const catalog = isYJ ? localCatalogYJ : localCatalogFen;
    const prefix = isYJ ? 'catalog-yj' : 'catalog-fen';
    const item = catalog[key];
    document.getElementById(prefix + '-id').value = key;
    document.getElementById(prefix + '-name').value = item.name;
    document.getElementById(prefix + '-price').value = item.price;
    document.getElementById(prefix + '-cost').value = item.cost;
    const btn = document.getElementById(prefix + '-submit-btn');
    btn.textContent = "Salva Modifiche";
    showToast("Dati caricati. Modifica e salva.", "info");
};

window.deleteCatalogItem = function(key, isYJ) {
    const catalog = isYJ ? localCatalogYJ : localCatalogFen;
    const collection = isYJ ? 'catalog' : 'catalog_fen';
    showConfirmModal("Elimina dal Catalogo", `Rimuovere "${catalog[key].name}"?`, () => {
        db.collection(collection).doc(key).delete()
            .then(() => showToast("Rimosso.", "info"))
            .catch(err => showToast(err.message, "error"));
    }, true);
};

function renderCatalogYJ() {
    const tbody = document.getElementById('catalog-yj-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const keys = Object.keys(localCatalogYJ);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td class="p-4 text-center text-gray-500 text-xs">Nessun servizio nel catalogo YJ.</td></tr>`;
        return;
    }
    keys.forEach(key => {
        const item = localCatalogYJ[key];
        tbody.innerHTML += `
            <tr class="hover:bg-gray-770/60 border-b border-gray-700">
                <td class="p-2 font-bold text-xs">${item.name}</td>
                <td class="p-2 text-emerald-400 text-xs">Prezzo: ${formatValuta(item.price)}</td>
                <td class="p-2 text-amber-500 text-xs">Costo: ${formatValuta(item.cost)}</td>
                <td class="p-2 text-right space-x-1">
                    <button onclick="window.editCatalogItem('${key}', true)" class="p-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500 hover:text-gray-900"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <button onclick="window.deleteCatalogItem('${key}', true)" class="p-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderCatalogFen() {
    const tbody = document.getElementById('catalog-fen-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const keys = Object.keys(localCatalogFen);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td class="p-4 text-center text-gray-500 text-xs">Nessun servizio nel catalogo Fenici.</td></tr>`;
        return;
    }
    keys.forEach(key => {
        const item = localCatalogFen[key];
        tbody.innerHTML += `
            <tr class="hover:bg-gray-770/60 border-b border-gray-700">
                <td class="p-2 font-bold text-xs">${item.name}</td>
                <td class="p-2 text-emerald-400 text-xs">Prezzo: ${formatValuta(item.price)}</td>
                <td class="p-2 text-amber-500 text-xs">Costo: ${formatValuta(item.cost)}</td>
                <td class="p-2 text-right space-x-1">
                    <button onclick="window.editCatalogItem('${key}', false)" class="p-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500 hover:text-gray-900"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <button onclick="window.deleteCatalogItem('${key}', false)" class="p-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600 hover:text-white"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </td>
            </tr>
        `;
    });
}

// --- INVENTARIO YJ ---
document.getElementById('inv-yj-search-filter')?.addEventListener('input', renderInventoryYjGrid);
document.getElementById('inv-yj-stash-filter')?.addEventListener('change', renderInventoryYjGrid);

function renderInventoryYjDropdowns() {
    const sel = document.getElementById('inv-yj-item-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleziona Oggetto --</option>';
    Object.keys(localInventoryYJ).forEach(key => {
        const item = localInventoryYJ[key];
        sel.innerHTML += `<option value="${key}">${item.name} (${getStashName(item.stash)}) - Disp: ${item.quantity}</option>`;
    });
}

function renderInventoryYjGrid() {
    const grid = document.getElementById('inventory-yj-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const searchVal = (document.getElementById('inv-yj-search-filter')?.value || '').toLowerCase();
    const stashVal = document.getElementById('inv-yj-stash-filter')?.value || 'all';
    let items = Object.keys(localInventoryYJ).map(k => ({ id: k, ...localInventoryYJ[k] }));
    if (stashVal !== 'all') items = items.filter(i => i.stash === stashVal);
    if (searchVal) items = items.filter(i => i.name.toLowerCase().includes(searchVal));
    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-6 text-gray-500 text-sm">Nessun oggetto in inventario YJ.</div>`;
        return;
    }
    const canDelete = userRole === 'gestore';
    items.forEach(item => {
        const safeName = String(item.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const deleteBtn = canDelete
            ? `<button onclick="event.stopPropagation(); window.deleteInventoryItem('${item.id}', '${safeName}', true)" class="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-xs z-20" title="Rimuovi oggetto (solo gestore)">
                    <i class="fa-solid fa-trash"></i>
               </button>`
            : '';
        const imgSrc = resolveItemImageUrl(item);
        grid.innerHTML += `
            <div onclick="openSmartModal('inv_yj', '${item.id}')" class="relative bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg flex flex-col group cursor-pointer hover:border-amber-500 transition-all inv-item-card">
                ${deleteBtn}
                <div class="h-28 w-full bg-gray-900 flex items-center justify-center p-2">
                    <img src="${imgSrc}" alt="${item.name}" loading="lazy" decoding="async" width="112" height="112" class="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-110 transition" onerror="this.src='https://via.placeholder.com/150?text=No+Immagine';">
                </div>
                <div class="p-3 flex-1 flex flex-col justify-between">
                    <h4 class="font-bold text-amber-400 text-sm truncate">${item.name}</h4>
                    <div class="mt-2 flex justify-between items-end">
                        <span class="text-[10px] text-gray-400 font-semibold bg-gray-700 px-2 py-0.5 rounded">${getStashName(item.stash)}</span>
                        <span class="text-emerald-400 font-bold text-sm">Qta: ${item.quantity}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

function renderInventoryYjLogs() {
    const tbody = document.getElementById('inventory-yj-logs-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (localInventoryYJLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500 text-xs">Nessun movimento.</td></tr>`;
        return;
    }
    const canDelete = userRole === 'gestore';
    localInventoryYJLogs.forEach(log => {
        const isDeposit = log.action === 'deposita';
        const badge = isDeposit
            ? `<span class="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold">📥 Deposita</span>`
            : `<span class="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs font-bold">📤 Preleva</span>`;
        const deleteBtn = canDelete
            ? `<button onclick="window.deleteInventoryLog('${log.id}', true)" class="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition" title="Elimina movimento (ripristina quantità)">
                    <i class="fa-solid fa-trash text-[10px]"></i>
               </button>`
            : '';
        tbody.innerHTML += `
            <tr class="hover:bg-gray-750/50 border-b border-gray-700">
                <td class="p-3 text-xs text-gray-400">${log.dateString}</td>
                <td class="p-3 font-semibold text-gray-200">${log.employeeName}</td>
                <td class="p-3">${badge}</td>
                <td class="p-3 text-gray-300 text-xs"><b>${log.itemName}</b> (x${log.quantity})</td>
                <td class="p-3 text-gray-400 text-xs italic truncate max-w-[150px]">${log.reason || '-'}</td>
                <td class="p-3 text-right">${deleteBtn}</td>
            </tr>
        `;
    });
}

document.getElementById('inventory-yj-admin-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('inv-yj-admin-name').value.trim();
    const imgId = document.getElementById('inv-yj-admin-img').value;
    const quantity = parseInt(document.getElementById('inv-yj-admin-qty').value) || 0;
    const stash = document.getElementById('inv-yj-admin-stash').value;
    if (!name) { showToast("Inserisci il nome dell'oggetto.", "warning"); return; }
    if (!stash) { showToast("Seleziona un deposito YJ.", "warning"); return; }
    let imageUrl = 'https://via.placeholder.com/150?text=No+Immagine';
    let imageFileName = '';
    let imageId = '';
    if (imgId && localItemImages[imgId]) {
        imageId = imgId;
        imageFileName = localItemImages[imgId].fileName || '';
        imageUrl = localItemImages[imgId].dataUrl || imageUrl;
    }
    const payloadYj = { name, imageFileName, quantity, stash, createdAt: Date.now() };
    if (imageId) {
        payloadYj.imageId = imageId;
        if (imageUrl && imageUrl.length < 55000) payloadYj.imageUrl = imageUrl;
    } else {
        payloadYj.imageUrl = imageUrl;
    }
    db.collection('inventory_items').add(payloadYj)
        .then((docRef) => {
            if (docRef && docRef.id) localInventoryYJ[docRef.id] = payloadYj;
            forceRefreshAfterWrite('inv_yj');
            e.target.reset();
            document.getElementById('inv-yj-admin-qty').value = 0;
            showToast("Oggetto creato solo in inventario YJ!", "success");
        })
        .catch(err => showToast("Errore salvataggio: " + err.message, "error"));
});

window.deleteInventoryItem = function(id, name, isYJ) {
    if (userRole !== 'gestore') {
        showToast("Solo il gestore può eliminare oggetti dall'inventario.", "error");
        return;
    }
    const collection = isYJ ? 'inventory_items' : 'fenici_items';
    showConfirmModal("Elimina Oggetto", `Rimuovere definitivamente "${name}" dall'inventario?`, () => {
        db.collection(collection).doc(id).delete()
            .then(() => showToast("Oggetto rimosso dall'inventario.", "info"))
            .catch(err => showToast(err.message, "error"));
    }, true);
};

/** Elimina un movimento inventario e ripristina la quantità sull'oggetto (solo gestore). */
window.deleteInventoryLog = function(logId, isYJ) {
    if (userRole !== 'gestore') {
        showToast("Solo il gestore può eliminare i movimenti.", "error");
        return;
    }
    const logs = isYJ ? localInventoryYJLogs : localInventoryFenLogs;
    const log = logs.find(l => l.id === logId);
    if (!log) {
        showToast("Movimento non trovato.", "error");
        return;
    }
    const collectionLogs = isYJ ? 'inventory_logs' : 'fenici_logs';
    const collectionItems = isYJ ? 'inventory_items' : 'fenici_items';
    const itemsMap = isYJ ? localInventoryYJ : localInventoryFen;
    const item = log.itemId ? itemsMap[log.itemId] : null;
    const qty = parseInt(log.quantity, 10) || 0;
    const actionLabel = log.action === 'deposita' ? 'deposito' : 'prelievo';

    showConfirmModal(
        "Elimina Movimento",
        `Eliminare il ${actionLabel} di "${log.itemName}" (x${qty}) di ${log.employeeName}? La quantità sull'oggetto verrà ripristinata.`,
        () => {
            const batch = db.batch();
            batch.delete(db.collection(collectionLogs).doc(logId));
            if (item && log.itemId && qty > 0) {
                let newQty = item.quantity || 0;
                // Inverti il movimento: se era prelievo → riaggiungi; se era deposito → togli
                if (log.action === 'preleva') {
                    newQty += qty;
                } else if (log.action === 'deposita') {
                    newQty = Math.max(0, newQty - qty);
                }
                batch.update(db.collection(collectionItems).doc(log.itemId), { quantity: newQty });
            }
            batch.commit()
                .then(() => {
                    // rimuovi log locale e aggiorna qty
                    if (isYJ) {
                        localInventoryYJLogs = localInventoryYJLogs.filter(l => l.id !== logId);
                        if (item && log.itemId) {
                            let nq = item.quantity || 0;
                            if (log.action === 'preleva') nq += qty;
                            else if (log.action === 'deposita') nq = Math.max(0, nq - qty);
                            localInventoryYJ[log.itemId].quantity = nq;
                        }
                        forceRefreshAfterWrite('inv_yj');
                    } else {
                        localInventoryFenLogs = localInventoryFenLogs.filter(l => l.id !== logId);
                        if (item && log.itemId) {
                            let nq = item.quantity || 0;
                            if (log.action === 'preleva') nq += qty;
                            else if (log.action === 'deposita') nq = Math.max(0, nq - qty);
                            localInventoryFen[log.itemId].quantity = nq;
                        }
                        forceRefreshAfterWrite('inv_fen');
                    }
                    showToast("Movimento eliminato e quantità aggiornata.", "info");
                })
                .catch(err => showToast(err.message, "error"));
        },
        true
    );
};

document.getElementById('inventory-yj-transaction-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const empId = document.getElementById('inv-yj-emp-select').value;
    const itemId = document.getElementById('inv-yj-item-select').value;
    const action = document.getElementById('inv-yj-action').value;
    const qty = parseInt(document.getElementById('inv-yj-qty').value) || 1;
    const reason = document.getElementById('inv-yj-reason').value.trim();
    if (!empId || !itemId) { showToast("Seleziona dipendente e oggetto.", "warning"); return; }
    const item = localInventoryYJ[itemId];
    if (!item) { showToast("Oggetto non trovato.", "error"); return; }
    let newQty = item.quantity;
    if (action === 'preleva') {
        if (qty > item.quantity) { showToast(`Disponibili solo ${item.quantity}.`, "error"); return; }
        newQty -= qty;
    } else newQty += qty;
    const empName = localEmployees[empId]?.name || 'Dipendente';
    const batch = db.batch();
    batch.update(db.collection('inventory_items').doc(itemId), { quantity: newQty });
    batch.set(db.collection('inventory_logs').doc(), {
        timestamp: Date.now(), dateString: new Date().toLocaleString('it-IT'),
        employeeId: empId, employeeName: empName, itemId, itemName: item.name,
        action, quantity: qty, reason
    });
    batch.commit().then(() => {
        if (localInventoryYJ[itemId]) localInventoryYJ[itemId].quantity = newQty;
        localInventoryYJLogs.unshift({
            id: 'local_' + Date.now(), timestamp: Date.now(),
            dateString: new Date().toLocaleString('it-IT'),
            employeeId: empId, employeeName: empName, itemId, itemName: item.name,
            action, quantity: qty, reason
        });
        if (localInventoryYJLogs.length > 50) localInventoryYJLogs.pop();
        forceRefreshAfterWrite('inv_yj');
        e.target.reset();
        document.getElementById('inv-yj-qty').value = 1;
        showToast("Movimento YJ registrato!", "success");
    }).catch(err => showToast(err.message, "error"));
});

// --- INVENTARIO FENICI (analogo) ---
document.getElementById('inv-fen-search-filter')?.addEventListener('input', renderInventoryFenGrid);
document.getElementById('inv-fen-stash-filter')?.addEventListener('change', renderInventoryFenGrid);

function renderInventoryFenDropdowns() {
    const sel = document.getElementById('inv-fen-item-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Seleziona Oggetto --</option>';
    Object.keys(localInventoryFen).forEach(key => {
        const item = localInventoryFen[key];
        sel.innerHTML += `<option value="${key}">${item.name} (${getStashName(item.stash)}) - Disp: ${item.quantity}</option>`;
    });
}

function renderInventoryFenGrid() {
    const grid = document.getElementById('inventory-fen-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const searchVal = (document.getElementById('inv-fen-search-filter')?.value || '').toLowerCase();
    const stashVal = document.getElementById('inv-fen-stash-filter')?.value || 'all';
    let items = Object.keys(localInventoryFen).map(k => ({ id: k, ...localInventoryFen[k] }));
    if (stashVal !== 'all') items = items.filter(i => i.stash === stashVal);
    if (searchVal) items = items.filter(i => i.name.toLowerCase().includes(searchVal));
    if (items.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-6 text-gray-500 text-sm">Nessun oggetto in inventario Fenici.</div>`;
        return;
    }
    const canDelete = userRole === 'gestore';
    items.forEach(item => {
        const safeName = String(item.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const deleteBtn = canDelete
            ? `<button onclick="event.stopPropagation(); window.deleteInventoryItem('${item.id}', '${safeName}', false)" class="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-xs z-20" title="Rimuovi oggetto (solo gestore)">
                    <i class="fa-solid fa-trash"></i>
               </button>`
            : '';
        const imgSrc = resolveItemImageUrl(item);
        grid.innerHTML += `
            <div onclick="openSmartModal('inv_fen', '${item.id}')" class="relative bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg flex flex-col group cursor-pointer hover:border-amber-500 transition-all inv-item-card">
                ${deleteBtn}
                <div class="h-28 w-full bg-gray-900 flex items-center justify-center p-2">
                    <img src="${imgSrc}" alt="${item.name}" loading="lazy" decoding="async" width="112" height="112" class="max-h-full max-w-full object-contain drop-shadow-md group-hover:scale-110 transition" onerror="this.src='https://via.placeholder.com/150?text=No+Immagine';">
                </div>
                <div class="p-3 flex-1 flex flex-col justify-between">
                    <h4 class="font-bold text-amber-400 text-sm truncate">${item.name}</h4>
                    <div class="mt-2 flex justify-between items-end">
                        <span class="text-[10px] text-gray-400 font-semibold bg-gray-700 px-2 py-0.5 rounded">${getStashName(item.stash)}</span>
                        <span class="text-emerald-400 font-bold text-sm">Qta: ${item.quantity}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

function renderInventoryFenLogs() {
    const tbody = document.getElementById('inventory-fen-logs-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (localInventoryFenLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500 text-xs">Nessun movimento.</td></tr>`;
        return;
    }
    const canDelete = userRole === 'gestore';
    localInventoryFenLogs.forEach(log => {
        const isDeposit = log.action === 'deposita';
        const badge = isDeposit
            ? `<span class="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold">📥 Deposita</span>`
            : `<span class="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs font-bold">📤 Preleva</span>`;
        const deleteBtn = canDelete
            ? `<button onclick="window.deleteInventoryLog('${log.id}', false)" class="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition" title="Elimina movimento (ripristina quantità)">
                    <i class="fa-solid fa-trash text-[10px]"></i>
               </button>`
            : '';
        tbody.innerHTML += `
            <tr class="hover:bg-gray-750/50 border-b border-gray-700">
                <td class="p-3 text-xs text-gray-400">${log.dateString}</td>
                <td class="p-3 font-semibold text-gray-200">${log.employeeName}</td>
                <td class="p-3">${badge}</td>
                <td class="p-3 text-gray-300 text-xs"><b>${log.itemName}</b> (x${log.quantity})</td>
                <td class="p-3 text-gray-400 text-xs italic truncate max-w-[150px]">${log.reason || '-'}</td>
                <td class="p-3 text-right">${deleteBtn}</td>
            </tr>
        `;
    });
}

document.getElementById('inventory-fen-admin-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('inv-fen-admin-name').value.trim();
    const imgId = document.getElementById('inv-fen-admin-img').value;
    const quantity = parseInt(document.getElementById('inv-fen-admin-qty').value) || 0;
    const stash = document.getElementById('inv-fen-admin-stash').value;
    if (!name) { showToast("Inserisci il nome dell'oggetto.", "warning"); return; }
    if (!stash) { showToast("Seleziona un deposito Fenici.", "warning"); return; }
    let imageUrl = 'https://via.placeholder.com/150?text=No+Immagine';
    let imageFileName = '';
    let imageId = '';
    if (imgId && localItemImages[imgId]) {
        imageId = imgId;
        imageFileName = localItemImages[imgId].fileName || '';
        imageUrl = localItemImages[imgId].dataUrl || imageUrl;
    }
    const payloadFen = { name, imageFileName, quantity, stash, createdAt: Date.now() };
    if (imageId) {
        payloadFen.imageId = imageId;
        if (imageUrl && imageUrl.length < 55000) payloadFen.imageUrl = imageUrl;
    } else {
        payloadFen.imageUrl = imageUrl;
    }
    db.collection('fenici_items').add(payloadFen)
        .then((docRef) => {
            if (docRef && docRef.id) localInventoryFen[docRef.id] = payloadFen;
            forceRefreshAfterWrite('inv_fen');
            e.target.reset();
            document.getElementById('inv-fen-admin-qty').value = 0;
            showToast("Oggetto creato solo in inventario Fenici!", "success");
        })
        .catch(err => showToast("Errore salvataggio: " + err.message, "error"));
});

document.getElementById('inventory-fen-transaction-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const empId = document.getElementById('inv-fen-emp-select').value;
    const itemId = document.getElementById('inv-fen-item-select').value;
    const action = document.getElementById('inv-fen-action').value;
    const qty = parseInt(document.getElementById('inv-fen-qty').value) || 1;
    const reason = document.getElementById('inv-fen-reason').value.trim();
    if (!empId || !itemId) { showToast("Seleziona dipendente e oggetto.", "warning"); return; }
    const item = localInventoryFen[itemId];
    if (!item) { showToast("Oggetto non trovato.", "error"); return; }
    let newQty = item.quantity;
    if (action === 'preleva') {
        if (qty > item.quantity) { showToast(`Disponibili solo ${item.quantity}.`, "error"); return; }
        newQty -= qty;
    } else newQty += qty;
    const empName = localEmployees[empId]?.name || 'Dipendente';
    const batch = db.batch();
    batch.update(db.collection('fenici_items').doc(itemId), { quantity: newQty });
    batch.set(db.collection('fenici_logs').doc(), {
        timestamp: Date.now(), dateString: new Date().toLocaleString('it-IT'),
        employeeId: empId, employeeName: empName, itemId, itemName: item.name,
        action, quantity: qty, reason
    });
    batch.commit().then(() => {
        if (localInventoryFen[itemId]) localInventoryFen[itemId].quantity = newQty;
        localInventoryFenLogs.unshift({
            id: 'local_' + Date.now(), timestamp: Date.now(),
            dateString: new Date().toLocaleString('it-IT'),
            employeeId: empId, employeeName: empName, itemId, itemName: item.name,
            action, quantity: qty, reason
        });
        if (localInventoryFenLogs.length > 50) localInventoryFenLogs.pop();
        forceRefreshAfterWrite('inv_fen');
        e.target.reset();
        document.getElementById('inv-fen-qty').value = 1;
        showToast("Movimento Fenici registrato!", "success");
    }).catch(err => showToast(err.message, "error"));
});


// --- EMPLOYEES (con login, password, ruoli) ---
const employeeForm = document.getElementById('employee-form');
const empSubmitBtn = document.getElementById('emp-submit-btn');
const empCancelEditBtn = document.getElementById('emp-cancel-edit-btn');

function resetEmployeeForm() {
    if (!employeeForm) return;
    employeeForm.reset();
    document.getElementById('emp-id').value = '';
    document.getElementById('role-sales-yj').checked = true;
    document.getElementById('role-sales-fen').checked = false;
    document.getElementById('role-inv-yj').checked = true;
    document.getElementById('role-inv-fen').checked = false;
    if (empSubmitBtn) {
        empSubmitBtn.innerHTML = '<i class="fa-solid fa-user-plus mr-1"></i> Registra Nuovo Dipendente';
        empSubmitBtn.className = 'flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition';
    }
    if (empCancelEditBtn) empCancelEditBtn.classList.add('hidden');
}

empCancelEditBtn?.addEventListener('click', resetEmployeeForm);

if (employeeForm) {
    employeeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const empId = document.getElementById('emp-id').value;
        const name = document.getElementById('emp-name').value.trim();
        const rank = document.getElementById('emp-rank').value.trim();
        const login = document.getElementById('emp-login').value.trim();
        const password = document.getElementById('emp-password').value.trim();
        const customPercentage = document.getElementById('emp-percentage').value;

        const roles = {
            salesYJ: document.getElementById('role-sales-yj').checked,
            salesFen: document.getElementById('role-sales-fen').checked,
            invYJ: document.getElementById('role-inv-yj').checked,
            invFen: document.getElementById('role-inv-fen').checked
        };

        if (!name || !rank || !login || !password) {
            showToast("Compila nome, grado, codice login e password.", "warning");
            return;
        }

        const empData = {
            name,
            rank,
            login,
            password,
            customPercentage: customPercentage !== "" ? parseInt(customPercentage) : null,
            roles,
            updatedAt: Date.now()
        };

        if (empId) {
            // Modifica esistente
            db.collection('employees').doc(empId).set(empData, { merge: true })
                .then(() => {
                    resetEmployeeForm();
                    showToast("Dipendente aggiornato con successo!", "success");
                })
                .catch(err => showToast(err.message, "error"));
        } else {
            // Nuovo
            empData.createdAt = Date.now();
            db.collection('employees').add(empData)
                .then(() => {
                    resetEmployeeForm();
                    showToast("Dipendente registrato con login e ruoli!", "success");
                })
                .catch(err => showToast(err.message, "error"));
        }
    });
}

window.editEmployee = function(key) {
    const emp = localEmployees[key];
    if (!emp) return;

    document.getElementById('emp-id').value = key;
    document.getElementById('emp-name').value = emp.name || '';
    document.getElementById('emp-rank').value = emp.rank || '';
    document.getElementById('emp-login').value = emp.login || '';
    document.getElementById('emp-password').value = emp.password || '';
    document.getElementById('emp-percentage').value = emp.customPercentage != null ? emp.customPercentage : '';

    const roles = emp.roles || {};
    document.getElementById('role-sales-yj').checked = !!roles.salesYJ;
    document.getElementById('role-sales-fen').checked = !!roles.salesFen;
    document.getElementById('role-inv-yj').checked = !!roles.invYJ;
    document.getElementById('role-inv-fen').checked = !!roles.invFen;

    if (empSubmitBtn) {
        empSubmitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> Salva Modifiche';
        empSubmitBtn.className = 'flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-sm rounded-xl transition';
    }
    if (empCancelEditBtn) empCancelEditBtn.classList.remove('hidden');

    // Scroll al form
    employeeForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast("Dati caricati. Modifica e premi Salva.", "info");
};

window.deleteEmployee = function(key) {
    showConfirmModal(
        "Rimuovi Dipendente",
        `Rimuovere "${localEmployees[key]?.name}"?`,
        () => {
            db.collection('employees').doc(key).delete()
                .then(() => {
                    if (document.getElementById('emp-id').value === key) resetEmployeeForm();
                    showToast("Dipendente rimosso.", "info");
                })
                .catch(err => showToast(err.message, "error"));
        },
        true
    );
};

function renderEmployees() {
    const tbody = document.getElementById('employee-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const keys = Object.keys(localEmployees);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 text-xs">Nessun dipendente.</td></tr>`;
        return;
    }
    keys.forEach(key => {
        const emp = localEmployees[key];
        const pct = emp.customPercentage ? `${emp.customPercentage}%` : '40%';
        const roles = emp.roles || {};
        const roleBadges = [];
        if (roles.salesYJ) roleBadges.push('<span class="text-amber-400">YJ</span>');
        if (roles.salesFen) roleBadges.push('<span class="text-orange-400">Fen</span>');
        if (roles.invYJ) roleBadges.push('<span class="text-blue-400">InvYJ</span>');
        if (roles.invFen) roleBadges.push('<span class="text-purple-400">InvFen</span>');
        tbody.innerHTML += `
            <tr class="hover:bg-gray-700/60 border-b border-gray-700 text-xs">
                <td class="p-2 font-bold text-amber-400">${emp.name || '-'}</td>
                <td class="p-2 text-gray-300">${emp.rank || '-'}</td>
                <td class="p-2 text-gray-300 font-mono">${emp.login || '-'}</td>
                <td class="p-2 text-gray-400 font-mono">${emp.password || '-'}</td>
                <td class="p-2 text-indigo-400">${pct}</td>
                <td class="p-2">${roleBadges.join(' ') || '-'}</td>
                <td class="p-2 text-right whitespace-nowrap space-x-1">
                    <button onclick="window.editEmployee('${key}')" class="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500 hover:text-gray-900 transition" title="Modifica">
                        <i class="fa-solid fa-pen text-[10px]"></i>
                    </button>
                    <button onclick="window.deleteEmployee('${key}')" class="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition" title="Elimina">
                        <i class="fa-solid fa-user-minus text-[10px]"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

window.updateSalaryStatus = function(employeeKey, statusValue) {
    db.collection('current_salaries_status').doc(employeeKey).set({ status: statusValue })
        .then(() => { showToast("Stato aggiornato.", "success"); calculateManagementData(); })
        .catch(err => showToast(err.message, "error"));
};

function calculateManagementData() {
    const filterValue = adminEmployeeFilter ? adminEmployeeFilter.value : "all";
    let totalSalesAmount = 0, totalYellowGain = 0, totalSalaries = 0, totalYellowItemCosts = 0;
    let staffStats = {};
    Object.keys(localEmployees).forEach(k => {
        staffStats[k] = {
            name: localEmployees[k].name,
            count: 0, salary: 0,
            pct: localEmployees[k].customPercentage || 40,
            status: localSalariesStatus[k] || 'non_pagato'
        };
    });

    const singleEmpTableBody = document.getElementById('single-employee-sales-table');
    const singleEmpCard = document.getElementById('single-employee-sales-card');
    const archiveSingleBtn = document.getElementById('archive-single-employee-btn');
    if (singleEmpTableBody) singleEmpTableBody.innerHTML = "";

    // Combina vendite YJ + Fenici
    const allSales = { ...localSalesYJ };
    Object.keys(localSalesFen).forEach(k => { allSales['fen_' + k] = localSalesFen[k]; });

    Object.keys(allSales).forEach(key => {
        const sale = allSales[key];
        const realKey = sale.employeeKey;
        if (!staffStats[realKey]) {
            staffStats[realKey] = {
                name: (sale.employeeName || 'Sconosciuto') + " (Rimosso)",
                count: 0, salary: 0, pct: sale.appliedPercentage || 40,
                status: localSalariesStatus[realKey] || 'non_pagato'
            };
        }
        staffStats[realKey].count += (sale.quantity || 1);
        staffStats[realKey].salary += sale.employeeGain;

        if (filterValue === 'all' || sale.employeeKey === filterValue) {
            totalSalesAmount += sale.totalPrice;
            totalYellowGain += sale.yellowGain;
            totalSalaries += sale.employeeGain;
            totalYellowItemCosts += (sale.yellowCost || 0);
            if (filterValue !== 'all' && singleEmpTableBody) {
                const activityLabel = (sale.activity === 'fenici') ? 'Fenici' : 'YJ';
                singleEmpTableBody.innerHTML += `
                    <tr class="hover:bg-gray-800 border-b border-gray-800">
                        <td class="py-2 text-gray-400">${sale.dateString}</td>
                        <td class="py-2 text-xs text-gray-500">${activityLabel}</td>
                        <td class="py-2 font-bold text-amber-400">${sale.serviceName}</td>
                        <td class="py-2 text-center text-gray-300">${sale.quantity || 1}</td>
                        <td class="py-2 text-emerald-400 font-semibold">${formatValuta(sale.totalPrice)}</td>
                        <td class="py-2 text-indigo-400 font-bold">${formatValuta(sale.employeeGain)}</td>
                    </tr>
                `;
            }
        }
    });

    if (filterValue !== 'all') {
        if (singleEmpCard) singleEmpCard.classList.remove('hidden');
        if (archiveSingleBtn) {
            archiveSingleBtn.classList.remove('hidden');
            archiveSingleBtn.textContent = `Archivia Settimana di ${localEmployees[filterValue]?.name || 'Dipendente'}`;
        }
        if (singleEmpTableBody && singleEmpTableBody.innerHTML === "") {
            singleEmpTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500 italic">Nessuna vendita non archiviata.</td></tr>`;
        }
    } else {
        if (singleEmpCard) singleEmpCard.classList.add('hidden');
        if (archiveSingleBtn) archiveSingleBtn.classList.add('hidden');
    }

    const totalExpenses = totalYellowItemCosts + totalSalaries;
    document.getElementById('kpi-total').textContent = formatValuta(totalSalesAmount);
    document.getElementById('kpi-yellow').textContent = formatValuta(totalYellowGain);
    document.getElementById('kpi-stipendi').textContent = formatValuta(totalSalaries);
    document.getElementById('kpi-expenses').textContent = formatValuta(totalExpenses);

    const tbody = document.getElementById('salary-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const staffKeys = Object.keys(staffStats);
    if (staffKeys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500 text-xs">Nessun dato.</td></tr>`;
        return;
    }
    staffKeys.forEach(k => {
        const s = staffStats[k];
        const highlight = (filterValue !== 'all' && k === filterValue) ? 'bg-amber-500/10' : '';
        tbody.innerHTML += `
            <tr class="hover:bg-gray-750/50 border-b border-gray-800 text-xs ${highlight}">
                <td class="py-3 font-semibold text-gray-200">${s.name}</td>
                <td class="py-3 text-gray-400">${s.count} oggetti</td>
                <td class="py-3 text-amber-500 font-bold">${s.pct}%</td>
                <td class="py-3 font-bold text-emerald-400 text-sm">${formatValuta(s.salary)}</td>
                <td class="py-3 text-right">
                    <select onchange="window.updateSalaryStatus('${k}', this.value)" class="px-2 py-1 bg-gray-700 text-xs rounded-lg text-white border border-gray-600">
                        <option value="non_pagato" ${s.status === 'non_pagato' ? 'selected' : ''}>🔴 Non Pagato</option>
                        <option value="pagato" ${s.status === 'pagato' ? 'selected' : ''}>🟢 Pagato</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

// --- ARCHIVIAZIONE ---
document.getElementById('archive-manual-btn')?.addEventListener('click', () => {
    const hasSales = Object.keys(localSalesYJ).length > 0 || Object.keys(localSalesFen).length > 0;
    if (!hasSales) {
        showToast("Nessun dato da archiviare.", "warning");
        return;
    }
    showConfirmModal("Archiviazione GENERALE", "Archiviare e azzerare i bilanci di TUTTI i dipendenti (YJ + Fenici)?", () => {
        archiveCurrentWeek();
    }, false);
});

function archiveCurrentWeek() {
    const archiveTitle = "Settimana conclusa il " + new Date().toLocaleDateString('it-IT');
    let finalStaffSalariesReport = {};
    Object.keys(localEmployees).forEach(k => {
        finalStaffSalariesReport[k] = {
            name: localEmployees[k].name,
            salary: 0,
            status: localSalariesStatus[k] || 'non_pagato'
        };
    });

    const allSales = { ...localSalesYJ };
    Object.keys(localSalesFen).forEach(k => { allSales['fen_' + k] = localSalesFen[k]; });

    Object.keys(allSales).forEach(sk => {
        const sale = allSales[sk];
        if (finalStaffSalariesReport[sale.employeeKey]) {
            finalStaffSalariesReport[sale.employeeKey].salary += sale.employeeGain;
        }
    });

    const archiveData = {
        title: archiveTitle,
        timestamp: Date.now(),
        sales: allSales,
        salariesReport: finalStaffSalariesReport
    };

    db.collection('archive').add(archiveData).then(() => {
        Object.keys(localSalesYJ).forEach(sk => db.collection('current_sales').doc(sk).delete());
        Object.keys(localSalesFen).forEach(sk => db.collection('current_sales_fen').doc(sk).delete());
        Object.keys(localSalariesStatus).forEach(ek => db.collection('current_salaries_status').doc(ek).delete());
        if (adminEmployeeFilter) adminEmployeeFilter.value = "all";
        showToast("Settimana archiviata e bilanci azzerati!", "success");
    }).catch(err => showToast(err.message, "error"));
}

document.getElementById('archive-single-employee-btn')?.addEventListener('click', () => {
    const empKey = adminEmployeeFilter.value;
    if (empKey === "all" || !empKey) return;
    const empName = localEmployees[empKey]?.name || "Dipendente";
    let singleSales = {};
    Object.keys(localSalesYJ).forEach(sk => {
        if (localSalesYJ[sk].employeeKey === empKey) singleSales[sk] = localSalesYJ[sk];
    });
    Object.keys(localSalesFen).forEach(sk => {
        if (localSalesFen[sk].employeeKey === empKey) singleSales['fen_' + sk] = localSalesFen[sk];
    });
    if (Object.keys(singleSales).length === 0) {
        showToast(`Nessuna vendita per ${empName}.`, "warning");
        return;
    }
    showConfirmModal(`Archiviazione: ${empName}`, `Archiviare SOLO le vendite di ${empName}?`, () => {
        const archiveTitle = `[SINGOLO] Settimana ${empName} - ` + new Date().toLocaleDateString('it-IT');
        let report = {};
        report[empKey] = {
            name: empName,
            salary: 0,
            status: localSalariesStatus[empKey] || 'non_pagato'
        };
        Object.keys(singleSales).forEach(sk => { report[empKey].salary += singleSales[sk].employeeGain; });
        db.collection('archive').add({
            title: archiveTitle, timestamp: Date.now(), sales: singleSales, salariesReport: report
        }).then(() => {
            Object.keys(localSalesYJ).forEach(sk => {
                if (localSalesYJ[sk].employeeKey === empKey) db.collection('current_sales').doc(sk).delete();
            });
            Object.keys(localSalesFen).forEach(sk => {
                if (localSalesFen[sk].employeeKey === empKey) db.collection('current_sales_fen').doc(sk).delete();
            });
            db.collection('current_salaries_status').doc(empKey).delete();
            if (adminEmployeeFilter) adminEmployeeFilter.value = "all";
            showToast(`Settimana di ${empName} archiviata!`, "success");
        }).catch(err => showToast(err.message, "error"));
    }, false);
});

window.deleteArchiveItem = function(key) {
    showConfirmModal("Elimina Archivio", "Eliminare definitivamente questo blocco di archivio?", () => {
        db.collection('archive').doc(key).delete()
            .then(() => showToast("Archivio rimosso.", "info"))
            .catch(err => showToast(err.message, "error"));
    }, true);
};

function renderArchive(archiveList) {
    const container = document.getElementById('archive-container');
    if (!container) return;
    container.innerHTML = '';
    const items = Object.keys(archiveList).map(k => ({ key: k, ...archiveList[k] }));
    items.sort((a, b) => b.timestamp - a.timestamp);
    if (items.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500">Nessun archivio storico.</p>`;
        return;
    }
    items.forEach(item => {
        let archTotal = 0, archYellow = 0;
        const salesCount = Object.keys(item.sales || {}).length;
        Object.keys(item.sales || {}).forEach(sk => {
            archTotal += item.sales[sk].totalPrice;
            archYellow += item.sales[sk].yellowGain;
        });
        let salariesHtml = "";
        if (item.salariesReport) {
            salariesHtml = `<div class="mt-2 pt-2 border-t border-gray-700/50 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-gray-400">`;
            Object.keys(item.salariesReport).forEach(ek => {
                const empRep = item.salariesReport[ek];
                if (empRep.salary > 0) {
                    const badge = empRep.status === 'pagato'
                        ? `<span class="text-emerald-400 font-semibold">🟢 Pagato</span>`
                        : `<span class="text-red-400 font-semibold">🔴 Non Pagato</span>`;
                    salariesHtml += `<div>${empRep.name}: <b>${formatValuta(empRep.salary)}</b> → ${badge}</div>`;
                }
            });
            salariesHtml += `</div>`;
        }
        container.innerHTML += `
            <div class="p-4 bg-gray-750/80 rounded-xl border border-gray-700 text-xs text-gray-300 shadow-md">
                <div class="flex flex-wrap justify-between items-center gap-2">
                    <div>
                        <p class="font-bold text-sm text-gray-200">${item.title}</p>
                        <p class="text-gray-400 mt-1">Vendite: <span class="text-amber-400">${salesCount}</span></p>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-emerald-400">Entrate: <b>${formatValuta(archTotal)}</b></span>
                        <span class="text-amber-400">Netto: <b>${formatValuta(archYellow)}</b></span>
                        <button onclick="window.deleteArchiveItem('${item.key}')" class="p-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white" title="Elimina">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>
                ${salariesHtml}
            </div>
        `;
    });
}
