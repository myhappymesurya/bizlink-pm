export function exportTablePDF(
  elementId: string,
  fileName: string,
  title: string
) {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element dengan ID "${elementId}" tidak ditemukan`)
    return
  }

  const opt: any = {
    margin: 10,
    filename: `${fileName}-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
  }

  ;(window as any).html2pdf().set(opt).from(element).save()
}