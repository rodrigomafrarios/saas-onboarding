import "./style.css";

import React from "react";
import TextField from "material-ui/TextField";
import RaisedButton from "material-ui/RaisedButton";

export const SignUpTenantForm = ({
  onSubmit,
  onChange,
  errors,
  tenant,
}: any) => {
  return (
    <div className="loginBox">
      <h1>Tenant Registration</h1>

      {errors.message && <p style={{ color: "red" }}>{errors.message}</p>}

      <form onSubmit={onSubmit}>
        <TextField
          name="subDomain"
          floatingLabelText="sub domain"
          value={tenant.subDomain}
          onChange={onChange}
          errorText={errors.subDomain}
        />
        <TextField
          name="adminEmail"
          floatingLabelText="admin e-mail"
          value={tenant.adminEmail}
          onChange={onChange}
          errorText={errors.adminEmail}
        />
       <TextField
          name="name"
          floatingLabelText="company came"
          value={tenant.name}
          onChange={onChange}
          errorText={errors.name}
        />
        <TextField
          name="tier"
          floatingLabelText="tier"
          value={tenant.tier}
          onChange={onChange}
          errorText={errors.tier}
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
