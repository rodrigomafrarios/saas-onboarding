import "./style.css";

import React from "react";
import TextField from "material-ui/TextField";
import RaisedButton from "material-ui/RaisedButton";
import FlatButton from "material-ui/FlatButton";

import PasswordStr from "./password-str";

export const ResetPasswordForm = ({
  onSubmit,
  onChange,
  errors,
  resetPassword,
  score,
  btnTxt,
  type,
  pwMask,
  onPwChange
}: any) => {
  
  return (
    <div className="loginBox">
      <h1>Reset Password</h1>
      {errors.message && <p style={{ color: "red" }}>{errors.message}</p>}

      <form onSubmit={onSubmit}>
        <TextField
          type="password"
          name="newPassword"
          floatingLabelText="new password"
          value={resetPassword.newPassword}
          onChange={onPwChange}
          errorText={errors.newPassword}
        />

        <div className="pwStrRow">
        {score >= 1 && (
          <div>
            <PasswordStr score={score} /> 
            <FlatButton 
              className="pwShowHideBtn" 
              label={btnTxt} onClick={pwMask} 
              style={{position: 'relative', left: '50%', transform: 'translateX(-50%)'}} 
            />
          </div>
          )} 
        </div>
        <TextField
          type="password"
          name="pwconfirm"
          floatingLabelText="confirm password"
          value={resetPassword.pwconfirm}
          onChange={onChange}
          errorText={errors.pwconfirm}
        />
        <br />
        <RaisedButton
          buttonStyle={{
            backgroundColor: "#00ecbd",
            color: "#00ecbd",
          }}
          className="signUpSubmit"
          primary={true}
          type="submit"
          label="submit"
        />
      </form>
      <p>
        Aleady have an account? <br />
        <a href="/login">Log in here</a>
      </p>
    </div>
  );
};
