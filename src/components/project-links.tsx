import { ExternalLink, Github } from "lucide-react";

const portfolioUrl = "https://darshdave.com";
const githubUrl = "https://github.com/darshdevlab/AdPilot";

export function ProjectLinks() {
  return (
    <nav className="project-link-row" aria-label="Project links">
      <a className="project-link project-link-primary" href={portfolioUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={15} />
        <span>Explore My Portfolio</span>
      </a>
      <a className="project-link" href={githubUrl} target="_blank" rel="noreferrer">
        <Github size={15} />
        <span>GitHub</span>
      </a>
    </nav>
  );
}
