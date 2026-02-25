/**
 * Genera y descarga un archivo CSV compatible con Excel (BOM + Separador punto y coma).
 * @param {Array} data - Array de objetos a exportar
 * @param {string} filename - Nombre del archivo
 */
export const downloadCSV = (data, filename = 'reporte.csv') => {
	if (!data || !data.length) {
		return;
	}

	const headers = Object.keys(data[0]);
	const csvRows = [headers.join(';')];

	const sanitizeSpreadsheetCell = (value) => {
		const raw = value === null || value === undefined ? '' : String(value);
		const trimmed = raw.trimStart();
		if (/^[=+\-@]/.test(trimmed)) {
			return `'${raw}`;
		}
		return raw;
	};

	for (const row of data) {
		const values = headers.map(header => {
			const stringVal = sanitizeSpreadsheetCell(row[header]).replace(/"/g, '""');
			return `"${stringVal}"`;
		});
		csvRows.push(values.join(';'));
	}

	const csvString = csvRows.join('\r\n');
	const bom = '\uFEFF';
	const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	link.setAttribute('href', URL.createObjectURL(blob));
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};

/**
 * Genera y descarga un archivo Excel (.xls) basado en HTML.
 * Soluciona definitivamente el problema de columnas unidas en Excel.
 * @param {Array} data - Array de objetos a exportar
 * @param {string} filename - Nombre del archivo
 */
export const downloadExcel = (data, filename = 'reporte.xls') => {
	if (!data || !data.length) {
		return;
	}

	const headers = Object.keys(data[0]);

	const sanitizeSpreadsheetCell = (value) => {
		const raw = value === null || value === undefined ? '' : String(value);
		const trimmed = raw.trimStart();
		if (/^[=+\-@]/.test(trimmed)) {
			return `'${raw}`;
		}
		return raw;
	};

	const escapeHtml = (value) =>
		String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');

	const html = `
		<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
		<head>
			<meta charset="UTF-8">
			<!--[if gte mso 9]>
			<xml>
				<x:ExcelWorkbook>
					<x:ExcelWorksheets>
						<x:ExcelWorksheet>
							<x:Name>Hoja1</x:Name>
							<x:WorksheetOptions>
								<x:DisplayGridlines/>
							</x:WorksheetOptions>
						</x:ExcelWorksheet>
					</x:ExcelWorksheets>
				</x:ExcelWorkbook>
			</xml>
			<![endif]-->
		</head>
		<body>
			<table border="1">
				<thead>
					<tr>
						${headers.map(h => `<th style="background-color: #f0f0f0;">${escapeHtml(h)}</th>`).join('')}
					</tr>
				</thead>
				<tbody>
					${data.map(row => `
						<tr>
							${headers.map(h => `<td>${escapeHtml(sanitizeSpreadsheetCell(row[h]))}</td>`).join('')}
						</tr>
					`).join('')}
				</tbody>
			</table>
		</body>
		</html>
	`;

	const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);

	const finalFilename = filename.replace(/\.csv$/i, '.xls');
	link.setAttribute('download', finalFilename.endsWith('.xls') ? finalFilename : `${finalFilename}.xls`);

	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};
