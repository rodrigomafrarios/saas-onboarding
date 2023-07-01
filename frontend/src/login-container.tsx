import zxcvbn from "zxcvbn";
import React from "react";
import { AuthenticationDetails, CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";

import { validateLoginForm } from "./validate";
import { LoginForm } from "./login-form";
import * as Config from "./config/config.json";

const userPool = new CognitoUserPool({
  ClientId: Config.cognito.clientId,
  UserPoolId: Config.cognito.userPoolId,
})

class LoginContainer extends React.Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      errors: {} as any,
      login: {
        email: "",
        password: ""
      } as any,
      btnTxt: "show",
      type: "password",
      score: "0"
    } as any;

    sessionStorage.clear();

    this.pwMask = this.pwMask.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.submitLogin = this.submitLogin.bind(this);
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
    const login = this.state.login;
    login[field] = event.target.value;

    this.setState({
      login
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
    const login = this.state.login;
    login[field] = event.target.value;

    this.setState({
      login
    });
  }

  submitLogin(params: { email: string, password: string }) {
    const { email, password } = params
    const user = new CognitoUser({
      Pool: userPool,
      Username: email
    })

    user.authenticateUser(
      new AuthenticationDetails({
        Username: email,
        Password: password,
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
          alert("This is your first login. You will be redirected to change your temporary password.");
          sessionStorage.email = email;
          sessionStorage.password = password;
          window.location.href = "/reset-password?firstLogin=true"
        }
      }
    )
  }

  validateForm(event: { preventDefault: () => void; }) {
    event.preventDefault();  
    
    const payload = validateLoginForm(this.state.login);

    if (payload.success) {
      this.setState({
        errors: {}
      });
      this.submitLogin({
        email: this.state.login.email,
        password: this.state.login.password
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
        <LoginForm
          onSubmit={this.validateForm}
          onChange={this.handleChange}
          onPwChange={this.pwHandleChange}
          errors={this.state.errors}
          login={this.state.login}
          pwMask={this.pwMask}
        />
      </div>
    );
  }
}

export default LoginContainer