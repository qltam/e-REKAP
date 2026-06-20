const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxNSsJydkr8Gxy1-Q3krq2VhbEG3EEfNEVnUwFkJ_g2zDYeOWgceqLaAmg5Yi0tQSI/exec";

let dataMaster = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 25;

// Ikon tempat sampah profesional (SVG)
const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
  <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.915 16h6.17a2 2 0 0 0 1.992-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-1 .92h-6.17a1 1 0 0 1-1-.92L2.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.074 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
</svg>`;

// 1. FUNGSI SIMPAN & UPLOAD
document.getElementById('formRekap').addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSimpan');
    btn.disabled = true;
    btn.innerText = "Sedang Mengupload...";

    const fileInput = document.getElementById('inFile');
    const file = fileInput.files[0];

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    try {
        const fileBase64 = await toBase64(file);
        const payload = {
            tanggal: document.getElementById('inTgl').value,
            dinas: document.getElementById('inDinas').value,
            ppk: document.getElementById('inPPK').value,
            rup: document.getElementById('inRUP').value,
            kerja: document.getElementById('inKerja').value,
            pagu: document.getElementById('inPagu').value,
            status: document.getElementById('inStatus').value,
            fileName: file.name,
            fileData: fileBase64
        };

        await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });

        alert("Data Berhasil Disimpan!");
        this.reset();
        await loadData();
    } catch (err) {
        alert("Gagal: " + err);
    } finally {
        btn.disabled = false;
        btn.innerText = "Simpan Data Rekap";
    }
});

// 2. FUNGSI AMBIL DATA
async function loadData() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `<tr><td colspan="10" class="text-center">Memuat data...</td></tr>`;
    try {
        const response = await fetch(SCRIPT_URL);
        const rawData = await response.json();

        // Urutkan terbaru di atas
        dataMaster = rawData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        filteredData = [...dataMaster];
        currentPage = 1;
        renderPagination();
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Gagal memuat data.</td></tr>`;
        console.error(err);
    }
}

// 3. FUNGSI RENDER TABEL & PAGINATION
function renderPagination() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedData = filteredData.slice(start, end);

    renderTable(paginatedData, start);
    updatePaginationControls();
}

function renderTable(data, startIndex = 0) {
    const body = document.getElementById('tableBody');
    if (!body) return;

    if (data.length === 0) {
        body.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Tidak ada data ditemukan.</td></tr>`;
        return;
    }

    body.innerHTML = data.map((i, index) => {
        let tanggalFormatted = '-';
        if (i.tanggal) {
            const parts = i.tanggal.split('-');
            tanggalFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : i.tanggal;
        }

        const nomorUrut = startIndex + index + 1;

        return `
        <tr>
            <td class="text-center text-muted small">${nomorUrut}</td>
            <td class="small">${tanggalFormatted}</td>
            <td class="fw-bold small text-uppercase">${i.dinas || '-'}</td>
            <td class="small">${i.ppk || '-'}</td>
            <td class="small text-muted">${i.rup || '-'}</td>
            <td class="small">${i.kerja || '-'}</td>
            <td class="small fw-semibold">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(i.pagu || 0)}</td>
            <td><a href="${i.dpp}" target="_blank" class="btn btn-sm btn-outline-info ${i.dpp ? '' : 'disabled'}">View</a></td>
            <td>
                <div class="d-flex justify-content-center align-items-center">
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="hapusData('${i.rup}', '${i.kerja}')" title="Hapus Data">
                        ${trashIcon}
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// 4. LOGIKA TOMBOL HALAMAN (DINAMIS)
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    const paginationContainer = document.getElementById('paginationContainer');

    // Jika data tidak lebih dari 1 halaman, sembunyikan navigasi
    if (totalPages <= 1) {
        paginationContainer.classList.add('d-none');
        return;
    }

    paginationContainer.classList.remove('d-none');
    document.getElementById('pageInfo').innerText = `Halaman ${currentPage} dari ${totalPages}`;

    // Sembunyikan tombol "Sebelumnya" jika di hal 1
    const btnPrev = document.getElementById('btnPrev');
    btnPrev.style.visibility = currentPage === 1 ? "hidden" : "visible";

    // Sembunyikan tombol "Selanjutnya" jika di hal terakhir
    const btnNext = document.getElementById('btnNext');
    btnNext.style.visibility = currentPage === totalPages ? "hidden" : "visible";
}

window.changePage = function (step) {
    currentPage += step;
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 5. UPDATE & HAPUS
async function updateStatus(rowNum, newStatus) {
    if (!newStatus) return;
    try {
        const payload = { action: "UPDATE_STATUS", row: rowNum, status: newStatus };
        await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("Status Berhasil Diperbarui!");
        await loadData();
    } catch (err) {
        alert("Gagal update status.");
    }
}

async function hapusData(rup, kerja) {
    if (!confirm("Hapus data pekerjaan ini?")) return;
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", rup: rup, kerja: kerja })
        });
        alert("Data dihapus.");
        await loadData();
    } catch (err) {
        alert("Gagal menghapus data.");
    }
}

// 6. FILTER
function applyFilters() {
    const fDinas = document.getElementById('fDinas').value.toLowerCase();
    const fPPK = document.getElementById('fPPK').value.toLowerCase();
    const fBulan = document.getElementById('fBulan').value;
    const fTahun = document.getElementById('fTahun').value;

    filteredData = dataMaster.filter(i => {
        const matchesDinas = (i.dinas || "").toLowerCase().includes(fDinas);
        const matchesPPK = (i.ppk || "").toLowerCase().includes(fPPK);
        const matchesBulan = fBulan === "" || (i.tanggal && i.tanggal.includes(fBulan));
        const matchesTahun = fTahun === "" || (i.tanggal && i.tanggal.includes(fTahun));
        return matchesDinas && matchesPPK && matchesBulan && matchesTahun;
    });

    currentPage = 1;
    renderPagination();
}

// Event Listeners
document.getElementById('fDinas').addEventListener('input', applyFilters);
document.getElementById('fPPK').addEventListener('input', applyFilters);
document.getElementById('fBulan').addEventListener('change', applyFilters);
document.getElementById('fTahun').addEventListener('change', applyFilters);

window.onload = loadData;