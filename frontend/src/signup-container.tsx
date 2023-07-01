import { useNavigate } from "react-router-dom";
import React from "react";
import axios from "axios";

import { validateSignUpForm } from "./validate";
import { SignUpForm } from "./signup-form";

class SignUpContainer extends React.Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      errors: {} as any,
      user: {
        givenName: "",
        familyName: "",
        invitee: "",
      } as any,
    } as any;

    this.handleChange = this.handleChange.bind(this);
    this.submitSignup = this.submitSignup.bind(this);
    this.validateForm = this.validateForm.bind(this);
  }

  handleChange(event: { target: { name: any; value: any; }; }) {
    const field = event.target.name;
    const user = this.state.user;
    user[field] = event.target.value;

    this.setState({
      user
    });
  }

  submitSignup(user: { invitee: string; givenName: string; familyName: string; hash: string }) {
    const params = {
      invitee: user.invitee,
      hash: user.hash,
      user: {
        givenName: user.givenName,
        familyName: user.familyName,
      }
    };

    axios
      .put(`${process.env.REACT_APP_BASE_URL}/signup`, params)
      .then(res => {
        if (res.status === 204) {
          alert("User has been registered.");
          const navigate = useNavigate();
          navigate("/login");
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
    const querystring = window.location.search.split("=")
    const hash = querystring[querystring.length - 1]

    const payload = validateSignUpForm({
      ...this.state.user,
      hash
    });

    if (payload.success) {
      this.setState({
        errors: {}
      });
      this.submitSignup({
        invitee: this.state.user.invitee,
        givenName: this.state.user.givenName,
        familyName: this.state.user.familyName,
        hash: hash as string
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
        <SignUpForm
          onSubmit={this.validateForm}
          onChange={this.handleChange}
          errors={this.state.errors}
          user={this.state.user}
        />
      </div>
    );
  }
}

export default SignUpContainer