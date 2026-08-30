import { redirect } from 'next/navigation'

/** 루트는 셸로 간다. 공매 보고서는 /report 에 그대로 있다. */
export default function Root() {
  redirect('/dash/case')
}
