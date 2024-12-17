import { useEffect } from "react"
import { useRouter } from "next/router"

interface PageTitleProps {
  title: string
}

const PageTitle: React.FC<PageTitleProps> = ({ title }) => {
  const router = useRouter()

  useEffect(() => {
    document.title = title
  }, [router.pathname, title])

  return null
}

export default PageTitle
