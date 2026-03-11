// ===== NVIDIA Color Control — Frontend Logic =====

let profiles = [];
let activeProfileId = null;
let selectedIcon = '🖥️';
let selectedDisplayIdx = 0;

let confirmTimer = null;
let confirmTimeLeft = 7;

const $profileList  = document.getElementById('profile-list');
const $profileCount = document.getElementById('profile-count');
const $activeIcon   = document.getElementById('active-icon');
const $activeName   = document.getElementById('active-name');
const $btnApply     = document.getElementById('btn-apply');
const $btnRename    = document.getElementById('btn-rename');
const $btnReset     = document.getElementById('btn-reset');
const $btnAdd       = document.getElementById('btn-add-profile');
const $modalOverlay = document.getElementById('modal-overlay');
const $renameInput  = document.getElementById('rename-input');
const $modalSave    = document.getElementById('modal-save');
const $modalCancel  = document.getElementById('modal-cancel');
const $gammaCanvas  = document.getElementById('gamma-curve');
const $rgbCanvas    = document.getElementById('rgb-bars');
const $displaySelect = document.getElementById('display-select');

// Confirmation modal elements
const $confirmOverlay = document.getElementById('confirm-overlay');
const $confirmTimerText = document.getElementById('confirm-timer');
const $confirmProgressBar = document.getElementById('confirm-progress-bar');
const $confirmOk = document.getElementById('confirm-ok');
const $confirmCancel = document.getElementById('confirm-cancel');

const SLIDER_CONFIG = {
    gamma:      { div: 100, suffix: '',  decimals: 2 },
    brightness: { div: 1,   suffix: '%', decimals: 0 },
    contrast:   { div: 1,   suffix: '%', decimals: 0 },
    vibrance:   { div: 1,   suffix: '%', decimals: 0 },
    red:        { div: 100, suffix: '',  decimals: 2 },
    green:      { div: 100, suffix: '',  decimals: 2 },
    blue:       { div: 100, suffix: '',  decimals: 2 },
};

const DEFAULT_PROFILE_ID = 'default';

function isDefaultProfile(id) { return id === DEFAULT_PROFILE_ID; }

// ===== Init =====
async function init() {
    try { profiles = await window.go.main.App.GetProfiles(); } catch (e) { profiles = []; }

    // Load displays
    try {
        const displays = await window.go.main.App.GetDisplays();
        $displaySelect.innerHTML = '';
        displays.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.index;
            opt.textContent = `🖥 ${d.name}`;
            $displaySelect.appendChild(opt);
        });
        $displaySelect.addEventListener('change', () => {
            selectedDisplayIdx = parseInt($displaySelect.value);
        });
    } catch (e) { /* single display fallback */ }

    // Removed explicit vibrance check to avoid false negatives completely disabling the slider

    if (profiles.length > 0) activeProfileId = profiles[0].id;

    renderProfileList();
    loadProfileToSliders();
    updateHeaderState();
    drawGammaCurve();
    drawRGBBars();
    setupSliderListeners();
    setupButtons();
    setupModal();
    setupConfirmModal();
}

// ===== Profile list =====
function renderProfileList() {
    $profileList.innerHTML = '';
    $profileCount.textContent = profiles.length;

    profiles.forEach(p => {
        const isDefault = isDefaultProfile(p.id);
        const isActive = p.id === activeProfileId;
        const card = document.createElement('div');
        card.className = 'profile-card' + (isActive ? ' active' : '') + (isDefault ? ' locked' : '');
        card.innerHTML = `
            <span class="p-icon">${p.icon}</span>
            <div class="p-info">
                <div class="p-name">${escapeHtml(p.name)}</div>
                <div class="p-sub">γ ${p.gamma.toFixed(2)} · V ${p.vibrance}%</div>
            </div>
            ${isDefault ? '' : `
            <div class="card-actions">
                <button class="btn-copy" title="Dupliquer">📋</button>
                <button class="btn-del" title="Supprimer">✕</button>
            </div>`}
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-actions')) return;
            activeProfileId = p.id;
            renderProfileList();
            loadProfileToSliders();
            updateHeaderState();
            drawGammaCurve();
            drawRGBBars();
        });

        if (!isDefault) {
            card.querySelector('.btn-copy')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const newP = await window.go.main.App.DuplicateProfile(p.id);
                    profiles = await window.go.main.App.GetProfiles();
                    activeProfileId = newP.id;
                    renderProfileList();
                    loadProfileToSliders();
                    updateHeaderState();
                    toast('Profil dupliqué');
                } catch (err) { console.error(err); }
            });

            card.querySelector('.btn-del')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (profiles.length <= 1) { toast('Impossible de supprimer le dernier profil'); return; }
                try {
                    await window.go.main.App.DeleteProfile(p.id);
                    profiles = await window.go.main.App.GetProfiles();
                    if (activeProfileId === p.id) activeProfileId = profiles[0]?.id || null;
                    renderProfileList();
                    loadProfileToSliders();
                    updateHeaderState();
                    toast('Profil supprimé');
                } catch (err) { console.error(err); }
            });
        }

        $profileList.appendChild(card);
    });
}

function updateHeaderState() {
    const p = getActiveProfile();
    const isDefault = p && isDefaultProfile(p.id);
    $btnRename.disabled = isDefault;
    // Disable sliders for default profile
    document.querySelectorAll('.slider-row').forEach(row => {
        const isVibrance = row.dataset.key === 'vibrance';
        if (isDefault) {
            row.classList.add('disabled');
        } else {
            row.classList.remove('disabled');
        }
    });
}

// ===== Sliders =====
function getActiveProfile() { return profiles.find(p => p.id === activeProfileId) || null; }

function loadProfileToSliders() {
    const p = getActiveProfile();
    if (!p) return;
    $activeIcon.textContent = p.icon;
    $activeName.textContent = p.name;
    setSlider('gamma', p.gamma * 100);
    setSlider('brightness', p.brightness);
    setSlider('contrast', p.contrast);
    setSlider('vibrance', p.vibrance);
    setSlider('red', p.red * 100);
    setSlider('green', p.green * 100);
    setSlider('blue', p.blue * 100);
}

function setSlider(key, rawValue) {
    const row = document.querySelector(`[data-key="${key}"]`);
    if (!row) return;
    const slider = row.querySelector('.slider');
    const display = row.querySelector('.slider-value');
    const cfg = SLIDER_CONFIG[key];
    slider.value = Math.round(rawValue);
    display.textContent = (rawValue / cfg.div).toFixed(cfg.decimals) + cfg.suffix;
}

function readSliderValue(key) {
    const row = document.querySelector(`[data-key="${key}"]`);
    if (!row) return 0;
    return parseFloat(row.querySelector('.slider').value);
}

function collectProfileFromSliders() {
    const p = getActiveProfile();
    if (!p) return null;
    return {
        ...p,
        gamma:      readSliderValue('gamma') / 100,
        brightness: Math.round(readSliderValue('brightness')),
        contrast:   readSliderValue('contrast'),
        vibrance:   Math.round(readSliderValue('vibrance')),
        red:        readSliderValue('red') / 100,
        green:      readSliderValue('green') / 100,
        blue:       readSliderValue('blue') / 100,
    };
}

function setupSliderListeners() {
    document.querySelectorAll('.slider-row').forEach(row => {
        const key = row.dataset.key;
        const slider = row.querySelector('.slider');
        const display = row.querySelector('.slider-value');
        const cfg = SLIDER_CONFIG[key];

        slider.addEventListener('input', () => {
            if (isDefaultProfile(activeProfileId)) return;
            display.textContent = (parseFloat(slider.value) / cfg.div).toFixed(cfg.decimals) + cfg.suffix;
            drawGammaCurve();
            drawRGBBars();
            const updated = collectProfileFromSliders();
            if (updated) {
                const idx = profiles.findIndex(p => p.id === activeProfileId);
                if (idx >= 0) {
                    profiles[idx] = updated;
                    const card = $profileList.children[idx];
                    if (card) {
                        const sub = card.querySelector('.p-sub');
                        if (sub) sub.textContent = `γ ${updated.gamma.toFixed(2)} · V ${updated.vibrance}%`;
                    }
                }
            }
        });

        slider.addEventListener('change', async () => {
            if (isDefaultProfile(activeProfileId)) return;
            const updated = collectProfileFromSliders();
            if (updated) {
                try { await window.go.main.App.SaveProfile(updated); } catch (e) { console.error(e); }
            }
        });
    });
}

// ===== Buttons =====
function setupButtons() {
    $btnApply.addEventListener('click', async () => {
        if ($btnApply.disabled) return;
        $btnApply.disabled = true;
        const p = collectProfileFromSliders();
        if (!p) {
            $btnApply.disabled = false;
            return;
        }
        try {
            if (confirmTimer) return; // Prevent apply if already confirming
            
            if (!isDefaultProfile(p.id)) await window.go.main.App.SaveProfile(p);
            await window.go.main.App.ApplyProfile(p, selectedDisplayIdx);
            
            // Start confirmation countdown
            showConfirmation();
        } catch (e) {
            console.error(e);
            toast('Erreur: ' + e);
            $btnApply.disabled = false;
        }
    });

    const $btnSoftReset = document.getElementById('btn-soft-reset');
    if ($btnSoftReset) {
        $btnSoftReset.addEventListener('click', async () => {
            if ($btnSoftReset.disabled) return;
            $btnSoftReset.disabled = true;
            if (confirmTimer) return; // Prevent soft reset if already confirming
            try {
                await window.go.main.App.ResetDisplay(selectedDisplayIdx);
                toast('Image d\'usine rétablie');
            } catch (e) {
                console.error(e);
            } finally {
                $btnSoftReset.disabled = false;
            }
        });
    }

    $btnReset.addEventListener('click', async () => {
        if ($btnReset.disabled) return;
        $btnReset.disabled = true;
        if (confirmTimer) return; // Prevent reset if already confirming
        try {
            await window.go.main.App.ResetDisplay(selectedDisplayIdx);
            setSlider('gamma', 100); setSlider('brightness', 50); setSlider('contrast', 50);
            setSlider('vibrance', 50); setSlider('red', 100); setSlider('green', 100); setSlider('blue', 100);
            drawGammaCurve(); drawRGBBars();
            toast('Écran réinitialisé');
            $btnReset.disabled = false;
        } catch (e) {
            console.error(e);
            $btnReset.disabled = false;
        }
    });

    $btnRename.addEventListener('click', () => {
        const p = getActiveProfile();
        if (!p || isDefaultProfile(p.id)) return;
        $renameInput.value = p.name;
        selectedIcon = p.icon;
        updateIconSelection();
        $modalOverlay.classList.remove('hidden');
        setTimeout(() => $renameInput.focus(), 100);
    });

    $btnAdd.addEventListener('click', async () => {
        try {
            const newP = await window.go.main.App.AddProfile('Nouveau profil', '🎮');
            profiles = await window.go.main.App.GetProfiles();
            activeProfileId = newP.id;
            renderProfileList();
            loadProfileToSliders();
            updateHeaderState();
            toast('Profil créé');
        } catch (e) { console.error(e); }
    });
}

// ===== Confirmation Modal Logic =====
function setupConfirmModal() {
    $confirmOk.addEventListener('click', () => {
        stopConfirmTimer();
        $confirmOverlay.classList.add('hidden');
        $btnApply.disabled = false;
        $btnReset.disabled = false;
        toast('Paramètres conservés');
    });

    $confirmCancel.addEventListener('click', () => {
        revertSettings();
    });
}

function showConfirmation() {
    if (confirmTimer) stopConfirmTimer();
    
    confirmTimeLeft = 7;
    $confirmTimerText.textContent = confirmTimeLeft;
    $confirmProgressBar.style.width = '100%';
    $confirmOverlay.classList.remove('hidden');
    
    // Disable buttons while confirming
    $btnApply.disabled = true;
    $btnReset.disabled = true;
    
    confirmTimer = setInterval(() => {
        confirmTimeLeft -= 0.1;
        if (confirmTimeLeft <= 0) {
            revertSettings();
            return;
        }
        $confirmTimerText.textContent = Math.ceil(confirmTimeLeft);
        $confirmProgressBar.style.width = (confirmTimeLeft / 7 * 100) + '%';
    }, 100);
}

function stopConfirmTimer() {
    if (confirmTimer) {
        clearInterval(confirmTimer);
        confirmTimer = null;
    }
}

async function revertSettings() {
    stopConfirmTimer();
    $confirmOverlay.classList.add('hidden');
    $btnApply.disabled = false;
    $btnReset.disabled = false;
    try {
        await window.go.main.App.ResetDisplay(selectedDisplayIdx);
        // We could restore previous values here, but user asked for reset
        // To be nicer, let's just reload the active profile to the screen if we want, 
        // but "ResetDisplay" is what happens if they don't confirm.
        toast('Affichage réinitialisé');
    } catch (e) { console.error(e); }
}

// ===== Modal =====
function setupModal() {
    $modalCancel.addEventListener('click', () => $modalOverlay.classList.add('hidden'));
    $modalOverlay.addEventListener('click', (e) => { if (e.target === $modalOverlay) $modalOverlay.classList.add('hidden'); });

    $modalSave.addEventListener('click', async () => {
        const p = getActiveProfile();
        if (!p || isDefaultProfile(p.id)) return;
        const newName = $renameInput.value.trim();
        if (!newName) return;
        p.name = newName;
        p.icon = selectedIcon;
        try {
            await window.go.main.App.SaveProfile(p);
            profiles = await window.go.main.App.GetProfiles();
            renderProfileList();
            loadProfileToSliders();
            $modalOverlay.classList.add('hidden');
            toast('Profil renommé');
        } catch (e) { console.error(e); }
    });

    document.querySelectorAll('.icon-opt').forEach(opt => {
        opt.addEventListener('click', () => { selectedIcon = opt.dataset.icon; updateIconSelection(); });
    });
}

function updateIconSelection() {
    document.querySelectorAll('.icon-opt').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.icon === selectedIcon);
    });
}

// ===== Canvas =====
function drawGammaCurve() {
    const ctx = $gammaCanvas.getContext('2d');
    const w = $gammaCanvas.width, h = $gammaCanvas.height;
    const gamma = readSliderValue('gamma') / 100;
    const contrast = readSliderValue('contrast') / 50;
    const brightness = readSliderValue('brightness') - 50;
    const red = readSliderValue('red') / 100, green = readSliderValue('green') / 100, blue = readSliderValue('blue') / 100;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo((w/4)*i, 0); ctx.lineTo((w/4)*i, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, (h/4)*i); ctx.lineTo(w, (h/4)*i); ctx.stroke();
    }

    [{m:red,c:'rgba(255,107,107,.7)'},{m:green,c:'rgba(57,211,83,.7)'},{m:blue,c:'rgba(88,166,255,.7)'}].forEach(ch => {
        ctx.beginPath(); ctx.strokeStyle = ch.c; ctx.lineWidth = 2;
        for (let i = 0; i <= w; i++) {
            let v = Math.pow(i/w, 1/gamma);
            v = (v-0.5)*contrast+0.5 + brightness/100;
            v = Math.max(0, Math.min(1, v * ch.m));
            if (i===0) ctx.moveTo(i, h-v*h); else ctx.lineTo(i, h-v*h);
        }
        ctx.stroke();
    });
}

function drawRGBBars() {
    const ctx = $rgbCanvas.getContext('2d');
    const w = $rgbCanvas.width, h = $rgbCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const vals = [readSliderValue('red')/100, readSliderValue('green')/100, readSliderValue('blue')/100];
    const colors = ['#ff6b6b','#39d353','#58a6ff'], labels = ['R','G','B'];
    const barW = w/5, gap = barW*0.3, startX = (w-(barW*3+gap*2))/2;
    vals.forEach((v,i) => {
        const x = startX+i*(barW+gap), barH = (v/2)*(h-14), y = h-barH-12;
        ctx.shadowColor = colors[i]; ctx.shadowBlur = 8;
        ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.roundRect(x,y,barW,barH,3); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(230,237,243,.5)';
        ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(labels[i], x+barW/2, h-2);
    });
}

// ===== Utils =====
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2500);
}

// ===== Boot =====
window.addEventListener('DOMContentLoaded', () => {
    if (window.go?.main?.App) { init(); return; }
    const t = setInterval(() => { if (window.go?.main?.App) { clearInterval(t); init(); } }, 50);
    setTimeout(() => clearInterval(t), 5000);
});
