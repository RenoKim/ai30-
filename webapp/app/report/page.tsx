import { redirect } from 'next/navigation'

/** 공매 보고서는 셸 안(/dash/report)으로 들어갔다. 옛 주소는 그리로 보낸다 */
export default function ReportRedirect() {
  redirect('/dash/report')
}
