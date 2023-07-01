import "./index.css";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ReactDOM from "react-dom";
import React from "react";
import path from "path";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import { createBrowserHistory } from "history";
import dotenv from "dotenv";

import SignUpTenantContainer from "./signup-tenant-container";
import SignUpContainer from "./signup-container";
import ResetPasswordContainer from "./reset-password-container";
import LoginContainer from "./login-container";
import ForgotPasswordContainer from "./forgot-password-container";

dotenv.config({
  path: path.join(__dirname, "../.env")
})

const history = createBrowserHistory();

let app = document.getElementById('root');
if (app) {
  const path = (/#!(\/.*)$/.exec(window.location.hash) || [])[1];
  if (path) {
    history.replace(path);
  }

  const App = () => (
    <MuiThemeProvider>
      <Router>
        <Routes>
          <Route path="/tenant/registration" element={<SignUpTenantContainer />}></Route>
          <Route path="/signup" element={<SignUpContainer />}></Route>
          <Route path="/forgot-password" element={<ForgotPasswordContainer></ForgotPasswordContainer>}></Route>
          <Route path="/reset-password" element={<ResetPasswordContainer></ResetPasswordContainer>}></Route>
          <Route path="/login" element={<LoginContainer></LoginContainer>}></Route>
          <Route path="/" element={<LoginContainer></LoginContainer>}></Route>
        </Routes>
      </Router>
    </MuiThemeProvider>
  );

  ReactDOM.render(<App />, app);
}
