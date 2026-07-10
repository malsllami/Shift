/** Placeholder.js — حالة صريحة "قيد الإنشاء" لأي صفحة لم تُبنَ خلفيتها بعد (بدل أي بيانات وهمية) */

export function renderPlaceholder(container, label) {
  container.innerHTML = `
    <div class="page">
      <div class="card card-pad" style="text-align:center; padding:48px 20px">
        <h2 style="font-size:16px; margin-bottom:8px">${label} قيد الإنشاء</h2>
        <p style="color:var(--text-muted); font-size:13.5px">هذا القسم لم يُبنَ بعد ضمن خارطة الطريق. سيظهر هنا فور اكتماله دون أي بيانات وهمية.</p>
      </div>
    </div>
  `;
}
