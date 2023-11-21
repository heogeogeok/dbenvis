import Logo from "../assets/images/logo.png";
import "../assets/stylesheets/Header.css";

function Header() {
  return (
    <div className="header">
      <div className="header-items">
        <img src={Logo} className="header-logo" alt="logo" />
        <h1 className="header-name">DBenVis</h1>
      </div>
      <hr />
    </div>
  );
}

export default Header;
