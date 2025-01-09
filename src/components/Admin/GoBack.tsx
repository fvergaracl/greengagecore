import React from "react";
import { useRouter } from "next/router";
import { useTranslation } from "@/hooks/useTranslation";

interface GoBackProps {
  customLink?: string;
  label?: string; 
  className?: string; 
  "data-cy"?: string; 
}

const GoBack: React.FC<GoBackProps> = ({
  customLink,
  label = "← Back", 
  className = "text-blue-600 cursor-pointer mb-4 inline-block",
  "data-cy": dataCy = "go-back-link", 
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (customLink) {
      router.push(customLink); 
    } else {
      router.back(); 
    }
  };

  return (
    <a
      onClick={handleClick}
      className={className}
      data-cy={dataCy}
      href={customLink || "#"} 
    >
      {t(label)}
    </a>
  );
};

export default GoBack;
