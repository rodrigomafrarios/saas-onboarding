import zxcvbn from "zxcvbn";
import React from "react";
import queryString from "querystring";
import axios from "axios";
import { AuthenticationDetails, CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";

import { validateResetPasswordForm } from "./validate";
import { ResetPasswordForm } from "./reset-password-form";
import * as Config from "./config/config.json";

const userPool = new CognitoUserPool({
  ClientId: Config.cognito.clientId,
  UserPoolId: Config.cognito.userPoolId,
})

class ResetPasswordContainer extends React.Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      errors: {} as any,
      resetPassword: {
        newPassword: "",
        pwconfirm: ""
      } as any,
      btnTxt: "show",
      type: "password",
      score: "0"
    } as any;

    this.pwMask = this.pwMask.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.submitResetPassword = this.submitResetPassword.bind(this);
    this.validateForm = this.validateForm.bind(this);
    this.pwHandleChange = this.pwHandleChange.bind(this);
  }

  pwMask(event: any) {
    event.preventDefault();
    this.setState((state: any) =>
      Object.assign({}, state, {
        type: this.state.type === "password" ? "input" : "password",
        btnTxt: this.state.btnTxt === "show" ? "hide" : "show"
      })
    );
  }

  pwHandleChange(event: { target: { name: any; value: string; }; }) {
    const field = event.target.name;
    const resetPassword = this.state.resetPassword;
    resetPassword[field] = event.target.value;

    this.setState({
      resetPassword
    });

    if (event.target.value === "") {
      this.setState((state: any) =>
        Object.assign({}, state, {
          score: "null"
        })
      );
    } else {
      var pw = zxcvbn(event.target.value);
      this.setState((state: any) =>
        Object.assign({}, state, {
          score: pw.score + 1
        })
      );
    }
  }

  handleChange(event: { target: { name: any; value: any; }; }) {
    const field = event.target.name;
    const resetPassword = this.state.resetPassword;
    resetPassword[field] = event.target.value;

    this.setState({
      resetPassword
    });
  }

  submitResetPassword(params: { newPassword: string, hash: string }) {

    axios
      .post(`${process.env.REACT_APP_BASE_URL}/reset-password`, params)
      .then(res => {
        if (res.status === 204) {
          alert("Password was reset")
          window.location.reload();
        } else {
          this.setState({
            errors: { message: res.data }
          });
        }
      })
      .catch((err: any) => {
        alert("Oops! An error occoured. Check the console.");
        console.error(err)
      });
  }

  validateForm(event: { preventDefault: () => void; }) {
    event.preventDefault();
    const queryStringParsed = queryString.parse(window.location.search)
    
    const qsKey = Object.keys(queryStringParsed)[0].replace("?", "");
    
    if (qsKey === "firstLogin") {
      const user = new CognitoUser({
        Pool: userPool,
        Username: sessionStorage.email as string
      })

      let self = this;

      user.authenticateUser(
      new AuthenticationDetails({
        Username: sessionStorage.email,
        Password: sessionStorage.password,
      }),
      {
        onSuccess: (res) => {
          localStorage.token = res.getIdToken().getJwtToken()
          alert("User autheticated");
        },
        onFailure: (error) => {
          alert("Login failed")
          console.error(error)
        },
        newPasswordRequired: () => {
          user.completeNewPasswordChallenge(self.state.resetPassword.newPassword, {}, {
            onSuccess: () => {
              alert("Password updated.");
              window.location.href = "/login";
            },
            onFailure: (error) => {
              alert("Login failed")
              console.error(error)
            },
          });
        }
      }
    )
    }
    
    const payload = validateResetPasswordForm({
      ...this.state.resetPassword,
      hash: queryStringParsed["hash"]
    });

    if (payload.success) {
      this.setState({
        errors: {}
      });
      this.submitResetPassword({
        newPassword: this.state.resetPassword.newPassword,
        hash: queryStringParsed["hash"] as string
      });
    } else {
      const errors = payload.errors;
      this.setState({
        errors
      });
    }
  }

  render() {
    return (
      <div>
        <ResetPasswordForm
          onSubmit={this.validateForm}
          onChange={this.handleChange}
          onPwChange={this.pwHandleChange}
          errors={this.state.errors}
          resetPassword={this.state.resetPassword}
          pwMask={this.pwMask}
        />
      </div>
    );
  }
}

export default ResetPasswordContainer